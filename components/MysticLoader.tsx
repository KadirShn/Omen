import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const MYSTIC_PHRASES = [
  "Yıldızlara danışılıyor...",
  "Geleceğin perdeleri aralanıyor...",
  "Ruhun fısıltıları dinleniyor...",
  "Evrenin enerjisi rüyanı yorumluyor...",
  "Zihninin derinliklerine bakılıyor...",
  "Mistik güçler cevap arıyor..."
];

interface MysticLoaderProps {
  visible: boolean;
}

export const MysticLoader: React.FC<MysticLoaderProps> = ({ visible }) => {
  const [phraseIndex, setPhraseIndex] = useState(0);
  
  // Animations
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      // Control rotation
      rotation.value = withRepeat(
        withTiming(360, { duration: 3000, easing: Easing.linear }),
        -1,
        false
      );

      // Control pulse
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );

      // Phrase cycling
      const interval = setInterval(() => {
        setPhraseIndex((prev) => (prev + 1) % MYSTIC_PHRASES.length);
      }, 2000);

      return () => {
        clearInterval(interval);
        rotation.value = 0;
        pulse.value = 1;
      };
    }
  }, [pulse, rotation, visible]);

  const animatedCircleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Magic Circle Ring */}
          <Animated.View style={[styles.magicRing, animatedCircleStyle]}>
              <View style={[styles.dot, { top: 0, left: '50%' }]} />
              <View style={[styles.dot, { bottom: 0, left: '50%' }]} />
              <View style={[styles.dot, { left: 0, top: '50%' }]} />
              <View style={[styles.dot, { right: 0, top: '50%' }]} />
          </Animated.View>

          {/* Icon */}
          <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
            <MaterialCommunityIcons name="crystal-ball" size={80} color="#fff" />
          </Animated.View>

          {/* Text */}
          <View style={styles.textContainer}>
            <Text style={styles.phrase}>{MYSTIC_PHRASES[phraseIndex]}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  magicRing: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
    position: 'absolute',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6c2e9c',
    position: 'absolute',
    marginLeft: -4,
    marginTop: -4,
    shadowColor: '#fff',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6c2e9c',
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 15,
  },
  textContainer: {
    marginTop: 40,
    height: 40,
    justifyContent: 'center',
  },
  phrase: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 1,
  },
});
