import { Audio } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
    Modal, Pressable, StyleSheet,
    Text, TextInput, TouchableOpacity, View
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function App() {
    const [recordings, setRecordings] = useState([]);
    const [recording, setRecording] = useState(null);
    const [recordingName, setRecordingName] = useState('');
    const [playing, setPlaying] = useState(-1);
    const [sound, setSound] = useState(null);
    const [isDialogVisible, setDialogVisible] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [timer, setTimer] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [intervalId, setIntervalId] = useState(null);

    // Timer update function
    useEffect(() => {
        let interval;
        if (isRecording && !isPaused) {
            interval = setInterval(() => {
                setTimer((prevTimer) => prevTimer + 1);
            }, 1000);
        } else if (intervalId) {
            clearInterval(intervalId);
        }
        setIntervalId(interval);
        return () => clearInterval(interval); // Cleanup interval on unmount
    }, [isRecording, isPaused]);

    async function startRecording() {
        try {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    }

    async function stopRecording() {
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
        });
        setIsRecording(false);
        setDialogVisible(true);
        setTimer(0); // Reset timer
    }

    const handleSaveRecording = () => {
        if (recordingName.trim() !== '') {
            const timestamp = new Date().toLocaleString(); 
            setRecordings([
                ...recordings,
                {
                    name: recordingName,
                    recording: recording,
                    timestamp: timestamp, 
                },
            ]);
            setRecording(undefined);
            setDialogVisible(false);
            setRecordingName('');
        }
    };

    const togglePause = async () => {
        if (isPaused) {
            await recording.startAsync(); // Continue recording
        } else {
            await recording.pauseAsync(); // Pause recording
        }
        setIsPaused(!isPaused);
    };

    useEffect(() => {
        return sound
            ? () => {
                sound.unloadAsync();
            }
            : undefined;
    }, [sound]);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Text style={styles.heading}>Voice Recorder</Text>

            <Modal visible={isDialogVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalText}>Enter Recording Name:</Text>
                        <TextInput
                            style={styles.textInput}
                            onChangeText={(text) => setRecordingName(text)}
                            value={recordingName}
                        />
                        <Pressable style={styles.saveButton} onPress={handleSaveRecording}>
                            <Text style={styles.buttonText}>Save</Text>
                        </Pressable>
                        <Pressable style={styles.cancelButton} onPress={() => setDialogVisible(false)}>
                            <Text style={styles.buttonText}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <View style={styles.list}>
                {recordings.map((recording, index) => (
                    <View key={index} style={styles.recordingItem}>
                        <TouchableOpacity
                            onPress={async () => {
                                const { sound } = await recording.recording.createNewLoadedSoundAsync(
                                    {
                                        isLooping: false,
                                        isMuted: false,
                                        volume: 1.0,
                                        rate: 1.0,
                                        shouldCorrectPitch: true,
                                    }
                                );
                                setSound(sound);
                                setPlaying(index);
                                await sound.playAsync();
                                await sound.setOnPlaybackStatusUpdate(async (status) => {
                                    if (status.didJustFinish) {
                                        setPlaying(-1);
                                        await sound.unloadAsync();
                                    }
                                });
                            }}
                            style={styles.playButton}
                        >
                            <Ionicons name={playing !== index ? "play" : "pause"} size={30} color="white" />
                            <Text style={styles.recordingName}>{recording.name}</Text>
                            <Text style={styles.timestamp}>{recording.timestamp}</Text>
                            <Ionicons
                                name="trash"
                                size={30}
                                color="white"
                                onPress={() => {
                                    setRecordings(recordings.filter((rec, i) => i !== index));
                                }}
                            />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>

            <View style={styles.footer}>
                <Pressable style={styles.recordButton} onPress={recording ? (isPaused ? togglePause : stopRecording) : startRecording}>
                    <Ionicons name={isRecording ? (isPaused ? "play" : "pause") : "mic"} size={40} color="white" />
                </Pressable>
            </View>

            {isRecording && (
                <View style={styles.timerContainer}>
                    <Text style={styles.timer}>{new Date(timer * 1000).toISOString().substr(14, 5)}</Text>
                    <View style={styles.animationCircle}></View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#1a1a2e",
        paddingTop: 50,
        paddingHorizontal: 20,
        alignItems: "center",
    },
    heading: {
        color: "#ffffff",
        fontSize: 24,
        textAlign: "center",
        fontWeight: "bold",
        marginBottom: 20,
    },
    list: {
        flex: 1,
        width: "100%",
    },
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
        backgroundColor: "#333",
        padding: 20,
        borderRadius: 10,
        alignItems: "center",
    },
    modalText: {
        color: "#fff",
        marginBottom: 10,
    },
    textInput: {
        height: 40,
        borderColor: "#666",
        borderWidth: 1,
        marginBottom: 10,
        paddingHorizontal: 10,
        color: "#fff",
        width: 200,
        borderRadius: 8,
        backgroundColor: "#444",
    },
    saveButton: {
        backgroundColor: "#0d6efd",
        padding: 10,
        borderRadius: 8,
        width: 80,
        alignItems: "center",
        marginTop: 5,
    },
    cancelButton: {
        backgroundColor: "#e63946",
        padding: 10,
        borderRadius: 8,
        width: 80,
        alignItems: "center",
        marginTop: 5,
    },
    buttonText: {
        color: "#fff",
    },
    recordingItem: {
        marginBottom: 10,
        backgroundColor: "#2e2e3d",
        padding: 15,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    playButton: {
        flexDirection: "row",
        alignItems: "center",
    },
    recordingName: {
        color: "#ffffff",
        fontSize: 16,
        marginLeft: 10,
    },
    timestamp: {
        color: "#999",
        fontSize: 12,
        marginLeft: 10,
        fontStyle: "italic",
    },
    footer: {
        position: "absolute",
        bottom: 40,
        alignSelf: "center",
    },
    recordButton: {
        backgroundColor: "#e63946",
        padding: 15,
        borderRadius: 50,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    timerContainer: {
        position: "absolute",
        bottom: 100,
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
    },
    timer: {
        color: "#fff",
        fontSize: 18,
        marginRight: 10,
    },
    animationCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "rgba(0, 255, 0, 0.5)",
        animation: "pulse 1.5s infinite",
    },
});
