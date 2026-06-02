// components/BottomSheet.tsx
import React, { useCallback, useEffect, useImperativeHandle, forwardRef, useRef, useMemo } from 'react';
import { StyleSheet, View, BackHandler } from 'react-native';
import Colors from '@/constants/Colors';
import { 
  BottomSheetModal, 
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFooter,
  BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: (string | number)[];
  initialSnap?: number;
  showHandle?: boolean;
  backgroundColor?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  onIndexChange?: (index: number) => void;
  enablePanDownToClose?: boolean;
  enableContentPanningGesture?: boolean;
  keyboardBehavior?: 'extend' | 'fillParent' | 'interactive';
  keyboardBlurBehavior?: 'none' | 'restore';
  android_keyboardInputMode?: 'adjustPan' | 'adjustResize';
}

export interface BottomSheetRef {
  snapTo: (index: number) => void;
  close: () => void;
}

const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  (
    {
      isOpen,
      onClose,
      children,
      snapPoints = ['50%'],
      showHandle = true,
      backgroundColor = Colors.surface,
      header,
      footer,
      onIndexChange,
      enablePanDownToClose = true,
      enableContentPanningGesture = true,
      keyboardBehavior = 'interactive',
      keyboardBlurBehavior = 'none',
      android_keyboardInputMode = 'adjustPan',
    },
    ref
  ) => {
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const insets = useSafeAreaInsets();

    const points = useMemo(() => {
        return snapPoints.map(p => {
            if (typeof p === 'number') {
                if (p <= 1) return `${p * 100}%`;
                return p;
            }
            return p;
        });
    }, [snapPoints]);

    // Expose methods
    useImperativeHandle(ref, () => ({
      snapTo: (index: number) => bottomSheetModalRef.current?.snapToIndex(index),
      close: () => bottomSheetModalRef.current?.dismiss(),
    }));

    // Handle back button on Android
    useEffect(() => {
        if (!isOpen) return;

        const backAction = () => {
            bottomSheetModalRef.current?.dismiss();
            return true;
        };

        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            backAction
        );

        return () => backHandler.remove();
    }, [isOpen]);

    // Handle open/close state changes
    useEffect(() => {
      if (isOpen) {
        bottomSheetModalRef.current?.present();
      } else {
        bottomSheetModalRef.current?.dismiss();
      }
    }, [isOpen]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.6}
        />
      ),
      []
    );

    const renderFooter = useCallback(
      (props: BottomSheetFooterProps) => (
        footer ? (
          <BottomSheetFooter {...props} bottomInset={insets.bottom}>
            <View style={styles.footerContainer}>
              {footer}
            </View>
          </BottomSheetFooter>
        ) : null
      ),
      [footer, insets.bottom]
    );

    return (
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={points}
        onChange={(index) => {
          if (index === -1) onClose();
          if (onIndexChange) onIndexChange(index);
        }}
        backdropComponent={renderBackdrop}
        footerComponent={footer ? renderFooter : undefined}
        backgroundStyle={{ backgroundColor }}
        handleComponent={showHandle ? undefined : null}
        handleIndicatorStyle={{ backgroundColor: Colors.whiteAlpha30 }}
        enablePanDownToClose={enablePanDownToClose}
        enableContentPanningGesture={enableContentPanningGesture}
        enableDynamicSizing={false}
        keyboardBehavior={keyboardBehavior}
        keyboardBlurBehavior={keyboardBlurBehavior}
        android_keyboardInputMode={android_keyboardInputMode}
      >
        <View style={[
          styles.contentContainer, 
          { paddingBottom: footer ? 0 : insets.bottom + 16 }
        ]}>
          {header && (
            <View style={styles.headerContainer}>
              {header}
            </View>
          )}
          <View style={styles.childrenContainer}>
            {children}
          </View>
        </View>
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  childrenContainer: {
    flex: 1,
  },
  footerContainer: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});

BottomSheet.displayName = 'BottomSheet';

export default BottomSheet;
