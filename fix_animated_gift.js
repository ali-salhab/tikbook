const fs = require('fs');
let c = fs.readFileSync('mobile/src/components/AnimatedGift.js', 'utf8');

// 1. Remove WebView import line
c = c.replace(/^import \{ WebView \} from "react-native-webview";\r?\n/m, '');

// 2. Remove TouchableOpacity from react-native import (unused now)
c = c.replace('  TouchableOpacity,\n', '');

// 3. Remove debug lines
c = c.replace(/^const \{widths,heights\} = Dimensions\.get\("screen"\)\r?\nconsole\.log\(widths,heights\);\r?\n/m, '');

// 4. Replace webm_alpha WebView block with expo-av Video block
const webmStart = c.indexOf('  // \u2500\u2500 WEBM with alpha channel \u2014 rendered via WebView');
const webmEnd = c.indexOf('\n  }', webmStart) + 4;  // end of the if block
if (webmStart !== -1) {
  const webmBlock = `  // \u2500\u2500 WEBM alpha: rendered as full-screen video (transparent in future rebuild) \u2500\u2500
  if (gift.animationType === "webm_alpha") {
    const videoUri = gift.webmUrl || gift.animationUrl;
    return (
      <Animated.View
        style={[styles.webmAlphaContainer, videoFadeStyle]}
        pointerEvents="none"
      >
        <Video
          source={{ uri: videoUri }}
          style={styles.webmAlphaVideo}
          resizeMode="contain"
          shouldPlay
          isLooping={false}
          isMuted={!!gift.soundUrl}
          volume={gift.soundUrl ? 0 : 1.0}
          onPlaybackStatusUpdate={(status) => {
            if (status.didJustFinish) exitAnimation();
          }}
        />
        <View style={styles.tiktokSender} pointerEvents="none">
          <Image
            source={{ uri: sender?.profileImage || sender?.avatar }}
            style={styles.tiktokAvatar}
          />
          <View>
            <Text style={styles.tiktokUsername}>{sender?.username}</Text>
            <Text style={styles.tiktokGiftLabel}>\uD83C\uDF81 {gift.nameAr || gift.name}</Text>
          </View>
        </View>
      </Animated.View>
    );
  }`;
  c = c.slice(0, webmStart) + webmBlock + c.slice(webmEnd);
  console.log('webm_alpha block replaced OK');
} else {
  console.log('webm_alpha block NOT FOUND');
}

// 5. Fix useEffect: rewrite entire block
const effectStart = c.indexOf('  // \u2500\u2500 Play optional separate sound');
const effectEnd = c.indexOf('  }, []);', effectStart) + 9;
if (effectStart !== -1) {
  const newEffect = `  // \u2500\u2500 Sound + entrance animation \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  useEffect(() => {
    if (gift.soundUrl) {
      (async () => {
        try {
          await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
          const { sound } = await Audio.Sound.createAsync(
            { uri: gift.soundUrl },
            { shouldPlay: true, volume: 1.0 },
          );
          soundRef.current = sound;
          sound.setOnPlaybackStatusUpdate((s) => {
            if (s.didJustFinish) sound.unloadAsync().catch(() => {});
          });
        } catch (_) {}
      })();
    }

    const isVideo =
      gift.animationType === "video" || gift.animationType === "webm_alpha";
    const duration = (gift.duration || 3) * 1000;

    if (isVideo) {
      opacity.value = withTiming(1, { duration: 350 });
      // Fallback timer — exits if onPlaybackStatusUpdate never fires
      const timer = setTimeout(exitAnimation, duration + 500);
      return () => {
        clearTimeout(timer);
        if (soundRef.current) soundRef.current.unloadAsync().catch(() => {});
      };
    } else {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSequence(
        withSpring(isCombo ? 1.8 : 1.2, { damping: 8, stiffness: 100 }),
        withSpring(isCombo ? 1.5 : 1.0, { damping: 10, stiffness: 100 }),
      );
      translateY.value = withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
      const timer = setTimeout(exitAnimation, duration);
      return () => {
        clearTimeout(timer);
        if (soundRef.current) soundRef.current.unloadAsync().catch(() => {});
      };
    }
  }, []);`;
  c = c.slice(0, effectStart) + newEffect + c.slice(effectEnd);
  console.log('useEffect replaced OK');
} else {
  console.log('useEffect NOT FOUND');
}

fs.writeFileSync('mobile/src/components/AnimatedGift.js', c, 'utf8');
console.log('AnimatedGift.js written OK, lines:', c.split('\n').length);
