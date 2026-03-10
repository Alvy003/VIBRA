import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Easing,
    Platform,
    Pressable,
} from 'react-native';
import { Mic, X, Radio, AudioLines } from 'lucide-react-native';
import {
    useAudioRecorder,
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
    RecordingPresets,
} from 'expo-audio';
import { useSearchStore } from '@/stores/useSearchStore';

type ModalState = 'idle' | 'listening' | 'recognizing' | 'result' | 'error';

interface AudioSearchModalProps {
    visible: boolean;
    onClose: () => void;
    onResult: (query: string) => void;
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL;

// ── Ripple ring ──────────────────────────────────────────────────────────────
const RippleRing = ({ scale }: { scale: Animated.Value }) => (
    <Animated.View
        style={[
            styles.ring,
            {
                opacity: scale.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 0],
                }),
                transform: [
                    {
                        scale: scale.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 2.5],
                        }),
                    },
                ],
            },
        ]}
    />
);

// ── Main component ───────────────────────────────────────────────────────────
export const AudioSearchModal = ({ visible, onClose, onResult }: AudioSearchModalProps) => {
    const [state, setState] = useState<ModalState>('idle');
    const [resultText, setResultText] = useState('');
    const [errorText, setErrorText] = useState('');

    // expo-audio recorder (hook must be at top-level)
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

    // Animations
    const slide = useRef(new Animated.Value(300)).current;
    const ripple1 = useRef(new Animated.Value(0)).current;
    const ripple2 = useRef(new Animated.Value(0)).current;
    const ripple3 = useRef(new Animated.Value(0)).current;
    const rippleAnimRef = useRef<Animated.CompositeAnimation | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Slide in/out ──────────────────────────────────────────────────────
    useEffect(() => {
        if (visible) {
            setState('idle');
            setResultText('');
            setErrorText('');
            Animated.spring(slide, {
                toValue: 0,
                useNativeDriver: true,
                tension: 80,
                friction: 12,
            }).start();
        } else {
            Animated.timing(slide, {
                toValue: 400,
                duration: 200,
                useNativeDriver: true,
                easing: Easing.in(Easing.ease),
            }).start();
            stopRipple();
            clearTimer();
        }
    }, [visible]);

    // ── Ripple ────────────────────────────────────────────────────────────
    const startRipple = useCallback(() => {
        const makeLoop = (anim: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 1400,
                        useNativeDriver: true,
                        easing: Easing.out(Easing.quad),
                    }),
                    Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
                ])
            );
        ripple1.setValue(0);
        ripple2.setValue(0);
        ripple3.setValue(0);
        rippleAnimRef.current = Animated.parallel([
            makeLoop(ripple1, 0),
            makeLoop(ripple2, 450),
            makeLoop(ripple3, 900),
        ]);
        rippleAnimRef.current.start();
    }, [ripple1, ripple2, ripple3]);

    const stopRipple = useCallback(() => {
        rippleAnimRef.current?.stop();
    }, []);

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // ── Recognition flow ──────────────────────────────────────────────────
    const startRecognition = useCallback(async () => {
        try {
            // 1. Request permission
            const { granted } = await requestRecordingPermissionsAsync();
            if (!granted) {
                setState('error');
                setErrorText('Microphone permission denied.\nPlease allow access in device settings.');
                return;
            }

            // 2. Prepare audio mode for recording
            await setAudioModeAsync({
                playsInSilentMode: true,
                allowsRecording: true,
            });

            // 3. Start recording
            await recorder.prepareToRecordAsync();
            recorder.record();
            setState('listening');
            startRipple();

            // 4. Stop after 7 seconds and send to backend
            timerRef.current = setTimeout(async () => {
                stopRipple();
                setState('recognizing');

                try {
                    await recorder.stop();
                    const uri = recorder.uri;

                    if (!uri) {
                        setState('error');
                        setErrorText('Could not capture audio. Please try again.');
                        return;
                    }

                    // Build multipart form
                    const formData = new FormData();
                    formData.append('audio', {
                        uri,
                        name: 'recording.m4a',
                        type: 'audio/m4a',
                    } as any);

                    const response = await fetch(`${API_BASE}/api/stream/recognize-song`, {
                        method: 'POST',
                        body: formData,
                    });

                    const data = await response.json();

                    if (data?.success && data.title) {
                        const q = `${data.title} ${data.artist}`;
                        setResultText(`${data.title} — ${data.artist}`);
                        setState('result');
                        useSearchStore.getState().setAudioSearchResult({
                            title: data.title,
                            artist: data.artist,
                        });
                        timerRef.current = setTimeout(() => onResult(q), 1500);
                    } else {
                        setState('error');
                        setErrorText(
                            data?.message ||
                            "Couldn't recognize the song.\nTry playing it louder or in a quieter place."
                        );
                    }
                } catch (fetchErr: any) {
                    console.error('[AudioSearch] Error:', fetchErr);
                    setState('error');
                    setErrorText('Recognition failed. Check your connection and try again.');
                }
            }, 7000);
        } catch (err: any) {
            stopRipple();
            setState('error');
            setErrorText(err?.message || 'Microphone error. Please try again.');
        }
    }, [recorder, startRipple, stopRipple, onResult]);

    // ── Close handler ─────────────────────────────────────────────────────
    const handleClose = useCallback(() => {
        stopRipple();
        clearTimer();
        // Attempt to stop recording gracefully if active
        if (recorder.isRecording) {
            recorder.stop().catch(() => { });
        }
        onClose();
    }, [stopRipple, clearTimer, recorder, onClose]);

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
            statusBarTranslucent
        >
            <Pressable style={styles.backdrop} onPress={handleClose}>
                <Animated.View
                    style={[styles.sheet, { transform: [{ translateY: slide }] }]}
                    onStartShouldSetResponder={() => true}
                >
                    <View style={styles.handleBar} />

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>
                            {state === 'idle' && 'Identify Song'}
                            {state === 'listening' && 'Listening...'}
                            {state === 'recognizing' && 'Identifying...'}
                            {state === 'result' && 'Found it!'}
                            {state === 'error' && 'Not recognized'}
                        </Text>
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                            <X size={20} color="#71717a" />
                        </TouchableOpacity>
                    </View>

                    {/* Body */}
                    <View style={styles.body}>
                        {/* Mic with ripple */}
                        <View style={styles.micWrapper}>
                            {state === 'listening' && (
                                <>
                                    <RippleRing scale={ripple1} />
                                    <RippleRing scale={ripple2} />
                                    <RippleRing scale={ripple3} />
                                </>
                            )}
                            <View
                                style={[
                                    styles.micCircle,
                                    state === 'listening' && styles.micCircleActive,
                                    state === 'result' && styles.micCircleSuccess,
                                ]}
                            >
                                {state === 'recognizing' ? (
                                    <Radio size={30} color="#fff" />
                                ) : (
                                    <AudioLines size={30} color="#fff" />
                                )}
                            </View>
                        </View>

                        {/* Status text */}
                        <Text style={styles.statusText}>
                            {state === 'idle' && 'Tap the button and hold your\nphone near the music'}
                            {state === 'listening' && 'Hold near the speaker for 7 seconds...'}
                            {state === 'recognizing' && 'Matching audio fingerprint...'}
                            {state === 'result' && resultText}
                            {state === 'error' && errorText}
                        </Text>

                        {/* CTA */}
                        {state === 'idle' && (
                            <TouchableOpacity
                                onPress={startRecognition}
                                style={styles.startBtn}
                                activeOpacity={0.8}
                            >
                                <AudioLines size={20} color="#fff" />
                                <Text style={styles.startBtnText}>Identify Song</Text>
                            </TouchableOpacity>
                        )}

                        {state === 'error' && (
                            <TouchableOpacity
                                onPress={() => { setState('idle'); setErrorText(''); }}
                                style={styles.retryBtn}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.retryText}>Try again</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            </Pressable>
        </Modal>
    );
};

AudioSearchModal.displayName = 'AudioSearchModal';

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#0f0f0f',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: Platform.OS === 'ios' ? 44 : 28,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#27272a',
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 4,
        position: 'relative',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    closeBtn: {
        position: 'absolute',
        right: 20,
        top: 6,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1c1c1e',
        alignItems: 'center',
        justifyContent: 'center',
    },
    body: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 24,
    },
    micWrapper: {
        width: 110,
        height: 110,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 28,
    },
    ring: {
        position: 'absolute',
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 2,
        borderColor: '#9333ea',
    },
    micCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#27272a',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    micCircleActive: {
        backgroundColor: '#9333ea',
        borderColor: '#7c3aed',
        shadowColor: '#9333ea',
        shadowOpacity: 0.7,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 0 },
        elevation: 14,
    },
    micCircleSuccess: {
        backgroundColor: '#16a34a',
        borderColor: '#15803d',
    },
    statusText: {
        color: '#a1a1aa',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
        maxWidth: 270,
    },
    startBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#9333ea',
        borderRadius: 14,
        paddingHorizontal: 32,
        paddingVertical: 14,
        shadowColor: '#9333ea',
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
    startBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    retryBtn: {
        backgroundColor: 'rgba(147, 51, 234, 0.12)',
        borderRadius: 12,
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.3)',
    },
    retryText: {
        color: '#9333ea',
        fontSize: 15,
        fontWeight: '600',
    },
});
