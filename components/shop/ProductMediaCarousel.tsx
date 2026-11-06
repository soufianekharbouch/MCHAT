import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";

import { PCOLORS } from "../purchase/purchaseUtils";
import { SpeciesIcon } from "./shopUi";
import type { ProductMedia, ShopProduct } from "../../types/shop";

/*
|--------------------------------------------------------------------------
| PRODUCT CAROUSEL (images + videos, like an Owl carousel)
|--------------------------------------------------------------------------
|
| - one slide per page, swipe left / right, dots under the slides
| - image: tap -> full screen (swipe there too, pinch on iOS)
| - video: poster + ▶, tap -> plays in the slide (sound off, controls);
|          paused automatically when the customer swipes to another slide
| - no media: main image, otherwise the species icon
| No extra library for the carousel (FlatList), expo-video for the videos.
|
*/

type Props = {
  product: ShopProduct;
  height: number;
  /** badges etc. shown over the slides */
  overlay?: React.ReactNode;
};

export default function ProductMediaCarousel({ product, height, overlay }: Props) {
  const slides = useMemo<ProductMedia[]>(() => {
    if (product.media && product.media.length > 0) return product.media;
    return product.image_url ? [{ id: "cover", type: "image", url: product.image_url }] : [];
  }, [product.media, product.image_url]);

  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const listRef = useRef<FlatList<ProductMedia>>(null);

  // Other product / other age: back to the first slide
  useEffect(() => {
    setIndex(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [product.id]);

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const goTo = (next: number) => {
    if (next < 0 || next >= slides.length) return;
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  };

  if (slides.length === 0) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <SpeciesIcon species={product.species} size={Math.round(height * 0.42)} color={PCOLORS.primary} />
        {overlay}
      </View>
    );
  }

  return (
    <View style={{ height }} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && (
        <FlatList
          ref={listRef}
          data={slides}
          keyExtractor={item => item.id}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item, index: i }) =>
            item.type === "video" ? (
              <VideoSlide media={item} width={width} height={height} active={i === index} />
            ) : (
              <Pressable onPress={() => setViewerIndex(i)} style={{ width, height }}>
                <Image source={{ uri: item.url }} style={{ width, height }} resizeMode="cover" />
              </Pressable>
            )
          }
        />
      )}

      {overlay}

      {/* Arrows (several slides) */}
      {slides.length > 1 && index > 0 && (
        <Pressable onPress={() => goTo(index - 1)} hitSlop={8} style={[styles.arrow, { left: 8, top: height / 2 - 16 }]}>
          <Ionicons name="chevron-back" size={18} color={PCOLORS.white} />
        </Pressable>
      )}
      {slides.length > 1 && index < slides.length - 1 && (
        <Pressable onPress={() => goTo(index + 1)} hitSlop={8} style={[styles.arrow, { right: 8, top: height / 2 - 16 }]}>
          <Ionicons name="chevron-forward" size={18} color={PCOLORS.white} />
        </Pressable>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <View style={styles.dots} pointerEvents="box-none">
          {slides.map((item, i) => (
            <Pressable key={item.id} onPress={() => goTo(i)} hitSlop={6}>
              <View style={[styles.dot, i === index && styles.dotActive]}>
                {item.type === "video" && i !== index && <View style={styles.dotVideo} />}
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <FullScreenViewer
        slides={slides}
        startIndex={viewerIndex}
        onClose={index2 => {
          setViewerIndex(null);
          if (index2 !== null && index2 !== index) goTo(index2);
        }}
      />
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| VIDEO SLIDE
|--------------------------------------------------------------------------
*/

function VideoSlide({ media, width, height, active }: { media: ProductMedia; width: number; height: number; active: boolean }) {
  const [started, setStarted] = useState(false);

  const player = useVideoPlayer(media.url, instance => {
    instance.loop = true;
    instance.muted = true;
  });

  // Swiped to another slide: paused
  useEffect(() => {
    if (!active) {
      try {
        player.pause();
      } catch {
        // player already released
      }
    }
  }, [active, player]);

  const start = useCallback(() => {
    setStarted(true);
    player.play();
  }, [player]);

  return (
    <View style={{ width, height, backgroundColor: "#000" }}>
      <VideoView
        player={player}
        style={{ width, height }}
        contentFit="cover"
        nativeControls={started}
        allowsFullscreen
        allowsPictureInPicture={false}
      />

      {!started && (
        <Pressable onPress={start} style={StyleSheet.absoluteFill}>
          {!!media.poster && <Image source={{ uri: media.poster }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
          <View style={styles.playOverlay}>
            <View style={styles.playButton}>
              <Ionicons name="play" size={30} color={PCOLORS.white} style={{ marginLeft: 3 }} />
            </View>
          </View>
        </Pressable>
      )}
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| FULL SCREEN IMAGES
|--------------------------------------------------------------------------
*/

function FullScreenViewer({
  slides,
  startIndex,
  onClose,
}: {
  slides: ProductMedia[];
  startIndex: number | null;
  onClose: (lastIndex: number | null) => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(startIndex ?? 0);

  // Images only (the videos play in the carousel)
  const images = slides.map((item, i) => ({ item, i })).filter(entry => entry.item.type === "image");
  const startPosition = Math.max(0, images.findIndex(entry => entry.i === startIndex));

  useEffect(() => {
    if (startIndex !== null) setCurrent(startPosition);
  }, [startIndex, startPosition]);

  if (startIndex === null) return null;

  return (
    <Modal visible animationType="fade" onRequestClose={() => onClose(images[current]?.i ?? null)} statusBarTranslucent>
      <View style={styles.viewer}>
        <FlatList
          data={images}
          keyExtractor={entry => entry.item.id}
          horizontal
          pagingEnabled
          initialScrollIndex={startPosition}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={event => setCurrent(Math.round(event.nativeEvent.contentOffset.x / width))}
          renderItem={({ item: entry }) => (
            <Image source={{ uri: entry.item.url }} style={{ width, height }} resizeMode="contain" />
          )}
        />

        <Pressable
          onPress={() => onClose(images[current]?.i ?? null)}
          hitSlop={12}
          style={[styles.viewerClose, { top: insets.top + 10 }]}
        >
          <Ionicons name="close" size={26} color={PCOLORS.white} />
        </Pressable>

        {images.length > 1 && (
          <Text style={[styles.viewerCount, { bottom: insets.bottom + 18 }]}>
            {current + 1} / {images.length}
          </Text>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  placeholder: { width: "100%", alignItems: "center", justifyContent: "center", backgroundColor: PCOLORS.primaryLight },

  arrow: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  dots: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  dotActive: { width: 20, backgroundColor: PCOLORS.white },
  dotVideo: { width: 4, height: 4, borderRadius: 2, backgroundColor: PCOLORS.primary },

  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.25)" },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(36,155,151,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },

  viewer: { flex: 1, backgroundColor: "#000" },
  viewerClose: {
    position: "absolute",
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerCount: { position: "absolute", alignSelf: "center", color: PCOLORS.white, fontSize: 13 },
});