import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getOtherUsers, getMessages, getGroupMessages, sendMessage, subscribeToMessages, createIncident, generateNotification, detectSplitMessage, getPersistedStrikes, setPersistedStrikes, getWarningCount, setWarningCount, getPersistedNotifications, persistNotifications } from '../lib/store';
import { analyzeMessage, analyzeVoice } from '../lib/analyze';
import { Message, AnalyzeResponse, VoiceAnalyzeResponse, Notification, ChatTarget } from '../lib/types';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatThread from '../components/chat/ChatThread';
import ChatInput from '../components/chat/ChatInput';
import ChatHeader from '../components/chat/ChatHeader';
import AlertBanner from '../components/chat/AlertBanner';
import BlockOverlay from '../components/chat/BlockOverlay';
import NotificationDropdown from '../components/chat/NotificationDropdown';
import './ChatPage.css';

export default function ChatPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [activeChat, setActiveChat] = useState<ChatTarget | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [shieldOn, setShieldOn] = useState(true);
  const [shieldOffline, setShieldOffline] = useState(false);
  const [strikeCount, setStrikeCount] = useState(() => currentUser ? getPersistedStrikes(currentUser) : 0);
  const [analyzing, setAnalyzing] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>(() => getPersistedNotifications());
  const [showNotifications, setShowNotifications] = useState(false);
  const [draftText, setDraftText] = useState<string | undefined>(undefined);
  
  // Alert banner state
  const [alertData, setAlertData] = useState<{
    response: AnalyzeResponse;
    text: string;
  } | null>(null);
  
  // Block overlay state
  const [blockData, setBlockData] = useState<{
    response: AnalyzeResponse;
    strikeNum: number;
  } | null>(null);

  // Pending message for alert flow
  const pendingMessageRef = useRef<{ text: string; receiver: string; groupId?: string } | null>(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
  }, [currentUser, navigate]);

  // Load messages when active chat changes
  useEffect(() => {
    if (!currentUser || !activeChat) return;
    
    const loadMessages = async () => {
      if (activeChat.type === 'group') {
        const msgs = await getGroupMessages(activeChat.id);
        setMessages(msgs);
      } else {
        const msgs = await getMessages(currentUser, activeChat.id);
        setMessages(msgs);
      }
    };
    loadMessages();
  }, [currentUser, activeChat]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!currentUser || !activeChat) return;
    
    const unsub = subscribeToMessages(async () => {
      if (activeChat.type === 'group') {
        const msgs = await getGroupMessages(activeChat.id);
        setMessages(msgs);
      } else {
        const msgs = await getMessages(currentUser, activeChat.id);
        setMessages(msgs);
      }
    });
    return unsub;
  }, [currentUser, activeChat]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // ── Local harmful word detection (client-side, always active) ──
  const checkLocalHarmful = useCallback((text: string): { severity: 'severe' | 'moderate'; category: string; harm_score: number } | null => {
    const lower = text.toLowerCase().trim();
    
    // Severe words (English + Tanglish threats)
    const severeWords = [
      'fuck', 'fck', 'fuk', 'fuq', 'f u c k',
      'motherfucker', 'mf',
      'rape', 'r4pe',
      'kill you', 'kys', 'kill yourself', 'will kill', 'gonna kill',
      'nigger', 'n1gger', 'nigga',
      'cunt', 'cnt',
      'slut', 'slt',
      'whore', 'whor',
      // Tanglish threat words
      'kolluven', 'kollu', 'koduven',  // will kill, kill
      'adikiren', 'adichu', 'adikuven',  // will beat, beat
      'saavkaari', 'saavakaari',  // death threat slang
    ];
    
    // Moderate words (English + Tanglish insults)
    const moderateWords = [
      'shit', 'sht', 'sh1t',
      'bitch', 'btch', 'b1tch',
      'ass', 'a55', 'a$$',
      'dick', 'dik', 'dck', 'd1ck',
      'damn', 'dmn',
      'hell',
      'idiot', 'idi0t',
      'stupid', 'stpd', 'stup1d',
      'hate', 'h8',
      'die', 'dy',
      'bastard', 'bstrd',
      'wtf', 'wth', 'stfu',
      'go to hell',
      'shut up',
      'dumb',
      'loser', 'l0ser',
      'ugly',
      'trash',
      'worthless',
      'pathetic',
      // Tanglish insults
      'loosu', 'loose',  // stupid
      'poda', 'podi',  // screw off
      'mokka',  // bad
      'naaye', 'naayi', 'naai',  // dog (offensive)
      'kazhuthai', 'kazhutha',  // donkey (insult)
      'otha', 'oothu',  // expletive
      'thevdiya', 'thevdia', 'thevidiya',  // offensive (women-targeted)
      'pottai',  // prostitute
      'sunni', 'pundai', 'koothi',  // vulgar abuses
      'poolai', 'poolu',  // vulgar
    ];
    
    for (const word of severeWords) {
      if (lower.includes(word)) {
        return { severity: 'severe', category: 'Severe toxicity / Hate speech', harm_score: 0.95 };
      }
    }
    
    for (const word of moderateWords) {
      if (lower.includes(word)) {
        return { severity: 'moderate', category: 'Toxic language', harm_score: 0.65 };
      }
    }
    
    return null;
  }, []);

  const handleSend = useCallback(async (text: string, fileUrl?: string, fileName?: string) => {
    if (!currentUser || !activeChat || cooldown > 0) return;
    
    const receiver = activeChat.id;
    const timestamp = new Date().toISOString();
    const groupId = activeChat.type === 'group' ? activeChat.id : undefined;
    
    // ── Split-message detection (always active) ──
    const splitDetection = detectSplitMessage(currentUser, receiver, text);
    if (splitDetection) {
      const splitResponse: AnalyzeResponse = {
        action: 'alert',
        harm_score: 0.85,
        category: splitDetection.category,
      };
      
      await createIncident({
        sender: currentUser,
        receiver,
        content: `[Split-message detected: "${splitDetection.phrase}"] Individual message: "${text}"`,
        action: 'alert',
        harm_score: 0.85,
        category: splitDetection.category,
        agent_t1: 0.85,
        agent_t2: 0.80,
        agent_t3: 0.70,
        timestamp,
      });
      
      pendingMessageRef.current = { text, receiver, groupId };
      setAlertData({ response: splitResponse, text: `Split-message evasion detected: "${splitDetection.phrase}"` });
      
      const newNotifs = [
        generateNotification('alert', currentUser, receiver, splitDetection.category, strikeCount),
        ...notifications,
      ];
      setNotifications(newNotifs);
      persistNotifications(newNotifs);
      return;
    }
    
    if (shieldOn) {
      // ── Local check first (instant) ──
      const localResult = checkLocalHarmful(text);
      
      if (localResult) {
        const warnings = getWarningCount(currentUser);
        // Threshold: after 3 warnings, auto-block with shadow ban
        const shouldBlock = warnings >= 3;
        
        if (shouldBlock) {
          // User has been warned enough — shadow ban the message
          const newStrike = strikeCount + 1;
          setStrikeCount(newStrike);
          setPersistedStrikes(currentUser, newStrike);
          
          setBlockData({
            response: {
              action: 'block',
              harm_score: localResult.harm_score,
              category: localResult.category,
            },
            strikeNum: newStrike,
          });
          setCooldown(30);
          
          // Shadow ban: sender sees 'sent', receiver never sees the message
          await sendMessage({
            sender: currentUser,
            receiver,
            content: text,
            status: 'sent',
            harm_score: localResult.harm_score,
            category: localResult.category,
            timestamp,
            group_id: groupId,
            shadow_banned: true,
          });
          
          await createIncident({
            sender: currentUser,
            receiver,
            content: text,
            action: 'block',
            harm_score: localResult.harm_score,
            category: localResult.category,
            agent_t1: localResult.harm_score,
            agent_t2: localResult.harm_score * 0.9,
            agent_t3: localResult.harm_score * 0.8,
            timestamp,
          });
          
          const newNotifs = [
            generateNotification('block', currentUser, receiver, localResult.category, newStrike),
            ...notifications,
          ];
          setNotifications(newNotifs);
          persistNotifications(newNotifs);
          return;
        }
        
        // Warning phase: alert the user to revise their text
        await createIncident({
          sender: currentUser,
          receiver,
          content: text,
          action: 'alert',
          harm_score: localResult.harm_score,
          category: localResult.category,
          agent_t1: localResult.harm_score,
          agent_t2: localResult.harm_score * 0.9,
          agent_t3: localResult.harm_score * 0.8,
          timestamp,
        });
        
        pendingMessageRef.current = { text, receiver, groupId };
        setAlertData({
          response: {
            action: 'alert',
            harm_score: localResult.harm_score,
            category: localResult.category,
          },
          text,
        });
        
        // Increment warning count
        setWarningCount(currentUser, warnings + 1);
        
        const newNotifs = [
          generateNotification('alert', currentUser, receiver, localResult.category, strikeCount),
          ...notifications,
        ];
        setNotifications(newNotifs);
        persistNotifications(newNotifs);
        return;
      }
      
      // ── API-based analysis (if no local match) ──
      setAnalyzing(true);
      setShieldOffline(false);
      
      const threadHistory = messages.slice(-10).map(m => m.content);
      
      const response = await analyzeMessage({
        text,
        sender: currentUser,
        receiver,
        thread_id: activeChat.type === 'group' ? activeChat.id : `conv_${currentUser}_${receiver}`,
        timestamp,
        thread_history: threadHistory,
      });

      setAnalyzing(false);

      if (!response) {
        setShieldOffline(true);
        setTimeout(() => setShieldOffline(false), 5000);
        
        await sendMessage({
          sender: currentUser,
          receiver,
          content: text,
          status: 'sent',
          harm_score: null,
          category: null,
          timestamp,
          file_url: fileUrl,
          file_name: fileName,
          group_id: groupId,
        });
        return;
      }

      await createIncident({
        sender: currentUser,
        receiver,
        content: text,
        action: response.action,
        harm_score: response.harm_score,
        category: response.category,
        agent_t1: response.agent_scores?.t1_toxicity ?? null,
        agent_t2: response.agent_scores?.t2_context ?? null,
        agent_t3: response.agent_scores?.t3_emotion ?? null,
        timestamp,
      });

      if (response.action === 'allow') {
        await sendMessage({
          sender: currentUser,
          receiver,
          content: text,
          status: 'sent',
          harm_score: response.harm_score,
          category: response.category,
          timestamp,
          file_url: fileUrl,
          file_name: fileName,
          group_id: groupId,
        });
      } else if (response.action === 'alert') {
        const warnings = getWarningCount(currentUser);
        if (warnings >= 3) {
          // Already warned enough — shadow ban
          const newStrike = strikeCount + 1;
          setStrikeCount(newStrike);
          setPersistedStrikes(currentUser, newStrike);
          setBlockData({ response: { ...response, action: 'block' }, strikeNum: newStrike });
          setCooldown(30);
          
          await sendMessage({
            sender: currentUser,
            receiver,
            content: text,
            status: 'sent',
            harm_score: response.harm_score,
            category: response.category,
            timestamp,
            group_id: groupId,
            shadow_banned: true,
          });
          
          const newNotifs = [
            generateNotification('block', currentUser, receiver, response.category, newStrike),
            ...notifications,
          ];
          setNotifications(newNotifs);
          persistNotifications(newNotifs);
        } else {
          setWarningCount(currentUser, warnings + 1);
          pendingMessageRef.current = { text, receiver, groupId };
          setAlertData({ response, text });
          
          const newNotifs = [
            generateNotification('alert', currentUser, receiver, response.category, strikeCount),
            ...notifications,
          ];
          setNotifications(newNotifs);
          persistNotifications(newNotifs);
        }
      } else if (response.action === 'block') {
        const newStrike = strikeCount + 1;
        setStrikeCount(newStrike);
        setPersistedStrikes(currentUser, newStrike);
        setBlockData({ response, strikeNum: newStrike });
        setCooldown(30);
        
        // Shadow ban: sender sees sent, receiver never sees it
        await sendMessage({
          sender: currentUser,
          receiver,
          content: text,
          status: 'sent',
          harm_score: response.harm_score,
          category: response.category,
          timestamp,
          group_id: groupId,
          shadow_banned: true,
        });
        
        const newNotifs = [
          generateNotification('block', currentUser, receiver, response.category, newStrike),
          ...notifications,
        ];
        setNotifications(newNotifs);
        persistNotifications(newNotifs);
      }
    } else {
      // Shield OFF — still do local check for severe content
      const localResult = checkLocalHarmful(text);
      if (localResult && localResult.severity === 'severe') {
        await createIncident({
          sender: currentUser,
          receiver,
          content: text,
          action: 'alert',
          harm_score: localResult.harm_score,
          category: localResult.category,
          agent_t1: localResult.harm_score,
          agent_t2: null,
          agent_t3: null,
          timestamp,
        });
        
        pendingMessageRef.current = { text, receiver, groupId };
        setAlertData({
          response: {
            action: 'alert',
            harm_score: localResult.harm_score,
            category: localResult.category + ' (Shield OFF — severe content detected)',
          },
          text,
        });
        return;
      }
      
      await sendMessage({
        sender: currentUser,
        receiver,
        content: text,
        status: 'sent',
        harm_score: null,
        category: null,
        timestamp,
        file_url: fileUrl,
        file_name: fileName,
        group_id: groupId,
      });
    }
  }, [currentUser, activeChat, shieldOn, messages, strikeCount, cooldown, checkLocalHarmful, notifications]);

  // ── Voice message handler ──
  const handleVoiceSend = useCallback(async (audioBlob: Blob, duration: number) => {
    if (!currentUser || !activeChat || cooldown > 0) return;

    const receiver = activeChat.id;
    const timestamp = new Date().toISOString();
    const groupId = activeChat.type === 'group' ? activeChat.id : undefined;

    // Convert blob to data URL for storage
    const toDataUrl = (b: Blob): Promise<string> =>
      new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(b);
      });
    const audioDataUrl = await toDataUrl(audioBlob);

    if (!shieldOn) {
      // Shield off → send voice message directly
      await sendMessage({
        sender: currentUser,
        receiver,
        content: '[Voice message]',
        status: 'sent',
        harm_score: null,
        category: null,
        timestamp,
        group_id: groupId,
        audio_url: audioDataUrl,
        audio_duration: duration,
      });
      return;
    }

    // Shield on → analyze voice via backend
    setAnalyzing(true);
    setShieldOffline(false);

    const response = await analyzeVoice(audioBlob, currentUser, receiver);
    setAnalyzing(false);

    if (!response) {
      setShieldOffline(true);
      setTimeout(() => setShieldOffline(false), 5000);
      // API failed — do NOT send unscreened, hold the message
      return;
    }

    const transcript = response.transcript || '[Voice message]';

    // Double-check transcript against local harmful words as safety net
    const localResult = checkLocalHarmful(transcript);
    const effectiveAction =
      localResult && response.action === 'allow'
        ? (localResult.severity === 'severe' ? 'block' : 'alert')
        : response.action;
    const effectiveScore = Math.max(response.harm_score, localResult?.harm_score ?? 0);
    const effectiveCategory = effectiveAction !== response.action
      ? localResult!.category
      : response.category;

    await createIncident({
      sender: currentUser,
      receiver,
      content: `[Voice] ${transcript}`,
      action: effectiveAction,
      harm_score: effectiveScore,
      category: effectiveCategory,
      agent_t1: response.agent_scores?.v1_stt ?? null,
      agent_t2: response.agent_scores?.v2_acoustic ?? null,
      agent_t3: response.agent_scores?.v3_emotion ?? null,
      timestamp,
    });

    if (effectiveAction === 'allow') {
      await sendMessage({
        sender: currentUser,
        receiver,
        content: transcript,
        status: 'sent',
        harm_score: effectiveScore,
        category: effectiveCategory,
        timestamp,
        group_id: groupId,
        audio_url: audioDataUrl,
        audio_duration: duration,
      });
    } else if (effectiveAction === 'alert') {
      const warnings = getWarningCount(currentUser);
      if (warnings >= 3) {
        const newStrike = strikeCount + 1;
        setStrikeCount(newStrike);
        setPersistedStrikes(currentUser, newStrike);
        setBlockData({ response: { action: 'block', harm_score: effectiveScore, category: effectiveCategory } as AnalyzeResponse, strikeNum: newStrike });
        setCooldown(30);

        await sendMessage({
          sender: currentUser,
          receiver,
          content: transcript,
          status: 'sent',
          harm_score: effectiveScore,
          category: effectiveCategory,
          timestamp,
          group_id: groupId,
          audio_url: audioDataUrl,
          audio_duration: duration,
          shadow_banned: true,
        });

        const newNotifs = [
          generateNotification('block', currentUser, receiver, effectiveCategory, newStrike),
          ...notifications,
        ];
        setNotifications(newNotifs);
        persistNotifications(newNotifs);
      } else {
        setWarningCount(currentUser, warnings + 1);
        setAlertData({ response: { action: 'alert', harm_score: effectiveScore, category: effectiveCategory } as AnalyzeResponse, text: `[Voice] ${transcript}` });

        // For voice alerts, still send shadow-banned so sender sees it
        await sendMessage({
          sender: currentUser,
          receiver,
          content: transcript,
          status: 'sent',
          harm_score: effectiveScore,
          category: effectiveCategory,
          timestamp,
          group_id: groupId,
          audio_url: audioDataUrl,
          audio_duration: duration,
          shadow_banned: true,
        });

        const newNotifs = [
          generateNotification('alert', currentUser, receiver, effectiveCategory, strikeCount),
          ...notifications,
        ];
        setNotifications(newNotifs);
        persistNotifications(newNotifs);
      }
    } else if (effectiveAction === 'block') {
      const newStrike = strikeCount + 1;
      setStrikeCount(newStrike);
      setPersistedStrikes(currentUser, newStrike);
      setBlockData({ response: { action: 'block', harm_score: effectiveScore, category: effectiveCategory } as AnalyzeResponse, strikeNum: newStrike });
      setCooldown(30);

      await sendMessage({
        sender: currentUser,
        receiver,
        content: transcript,
        status: 'sent',
        harm_score: effectiveScore,
        category: effectiveCategory,
        timestamp,
        group_id: groupId,
        audio_url: audioDataUrl,
        audio_duration: duration,
        shadow_banned: true,
      });

      const newNotifs = [
        generateNotification('block', currentUser, receiver, effectiveCategory, newStrike),
        ...notifications,
      ];
      setNotifications(newNotifs);
      persistNotifications(newNotifs);
    }
  }, [currentUser, activeChat, shieldOn, strikeCount, cooldown, notifications, checkLocalHarmful]);

  const handleAlertSendAnyway = useCallback(async () => {
    if (!pendingMessageRef.current || !currentUser || !alertData) return;
    
    const { text, receiver, groupId } = pendingMessageRef.current;
    const newStrike = strikeCount + 1;
    setStrikeCount(newStrike);
    setPersistedStrikes(currentUser, newStrike);
    
    // User ignored warning → block + shadow ban
    setBlockData({
      response: {
        action: 'block',
        harm_score: alertData.response.harm_score,
        category: alertData.response.category,
      },
      strikeNum: newStrike,
    });
    setCooldown(30);
    
    // Shadow ban: sender sees 'sent', receiver never sees it
    await sendMessage({
      sender: currentUser,
      receiver,
      content: text,
      status: 'sent',
      harm_score: alertData.response.harm_score,
      category: alertData.response.category,
      timestamp: new Date().toISOString(),
      group_id: groupId,
      shadow_banned: true,
    });
    
    await createIncident({
      sender: currentUser,
      receiver,
      content: text,
      action: 'block',
      harm_score: alertData.response.harm_score,
      category: alertData.response.category,
      agent_t1: alertData.response.harm_score,
      agent_t2: alertData.response.harm_score * 0.9,
      agent_t3: alertData.response.harm_score * 0.8,
      timestamp: new Date().toISOString(),
    });
    
    const newNotifs = [
      generateNotification('block', currentUser, receiver, alertData.response.category, newStrike),
      ...notifications,
    ];
    setNotifications(newNotifs);
    persistNotifications(newNotifs);
    
    setAlertData(null);
    pendingMessageRef.current = null;
  }, [currentUser, alertData, strikeCount, notifications]);

  const handleAlertEdit = useCallback(() => {
    const text = pendingMessageRef.current?.text || '';
    setDraftText(text);
    setAlertData(null);
    pendingMessageRef.current = null;
    return text;
  }, []);

  const handleAlertCancel = useCallback(() => {
    setAlertData(null);
    pendingMessageRef.current = null;
  }, []);

  const handleBlockDismiss = useCallback(() => {
    setBlockData(null);
  }, []);

  if (!currentUser) return null;

  const otherUsers = getOtherUsers(currentUser);
  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <div className="chat-page theme-chat">
      <ChatHeader
        shieldOn={shieldOn}
        shieldOffline={shieldOffline}
        onToggleShield={() => setShieldOn(!shieldOn)}
        strikeCount={strikeCount}
        notificationCount={unreadNotifications}
        onNotificationClick={() => setShowNotifications(!showNotifications)}
        currentUser={currentUser}
      />
      
      {showNotifications && (
        <NotificationDropdown
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onMarkRead={(id) => setNotifications(prev => 
            prev.map(n => n.id === id ? { ...n, read: true } : n)
          )}
        />
      )}

      <div className="chat-body">
        <ChatSidebar
          currentUser={currentUser}
          users={otherUsers}
          activeChat={activeChat}
          onSelectChat={setActiveChat}
          messages={messages}
        />
        
        <div className="chat-main">
          {alertData && (
            <AlertBanner
              category={alertData.response.category}
              harmScore={alertData.response.harm_score}
              onSendAnyway={handleAlertSendAnyway}
              onEdit={handleAlertEdit}
              onCancel={handleAlertCancel}
            />
          )}
          
          {activeChat ? (
            <>
              <ChatThread
                messages={messages}
                currentUser={currentUser}
              />
              <ChatInput
                onSend={(t, f, fn) => {
                  setDraftText(undefined);
                  handleSend(t, f, fn);
                }}
                onSendVoice={handleVoiceSend}
                disabled={cooldown > 0}
                cooldown={cooldown}
                analyzing={analyzing}
                editText={draftText}
              />
            </>
          ) : (
            <div className="chat-empty">
              <p>Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>

      {blockData && (
        <BlockOverlay
          strikeNum={blockData.strikeNum}
          category={blockData.response.category}
          cooldown={cooldown}
          onDismiss={handleBlockDismiss}
        />
      )}
    </div>
  );
}
