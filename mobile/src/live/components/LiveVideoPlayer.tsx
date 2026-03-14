import React from "react";
import { ImageBackground, StyleSheet, Text, View } from "react-native";

type Props = {
  title?: string;
  hostName?: string;
  coverImage?: string;
  children?: React.ReactNode;
};

const LiveVideoPlayer = ({
  title = "Live Room",
  hostName = "Host",
  coverImage,
  children,
}: Props) => {
  return (
    <ImageBackground
      source={{
        uri:
          coverImage ||
          "https://images.unsplash.com/photo-1511746315387-c4a76990fdc9?auto=format&fit=crop&w=1200&q=80",
      }}
      style={styles.container}
      imageStyle={styles.backgroundImage}
    >
      <View style={styles.overlay}>
        <View style={styles.metaCard}>
          <Text style={styles.hostLabel} numberOfLines={1}>
            {hostName}
          </Text>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {children}
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#04050A",
  },
  backgroundImage: {
    opacity: 0.58,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(4, 6, 14, 0.5)",
    paddingTop: 12,
  },
  metaCard: {
    marginHorizontal: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(13, 19, 38, 0.6)",
  },
  hostLabel: {
    color: "#FDBA74",
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },
});

export default LiveVideoPlayer;
