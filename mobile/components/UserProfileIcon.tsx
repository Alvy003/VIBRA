import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { Image } from 'expo-image';
import { useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';

interface UserProfileIconProps {
  size?: number;
  style?: any;
}

export const UserProfileIcon = React.memo(({ size = 34, style }: UserProfileIconProps) => {
  const { user } = useUser();
  const router = useRouter();

  const handlePress = () => {
    router.push('/profile' as any);
  };

  const borderRadius = size / 2;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: borderRadius,
        },
        style,
      ]}
    >
      {user?.imageUrl ? (
        <Image
          source={{ uri: user.imageUrl }}
          style={styles.image}
          cachePolicy="memory-disk"
          transition={200}
        />
      ) : (
        <View style={[styles.placeholder, { borderRadius }]}>
          <Text style={[styles.initial, { fontSize: size * 0.4 }]}>
            {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'V'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderWidth: 0,
    backgroundColor: '#18181b',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27272a',
  },
  initial: {
    color: '#fff',
    fontWeight: '600',
  },
});

UserProfileIcon.displayName = 'UserProfileIcon';
