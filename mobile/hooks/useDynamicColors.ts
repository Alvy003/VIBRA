import { useEffect, useState } from 'react';
import { getColors } from 'react-native-image-colors';
import { Platform } from 'react-native';

export interface DynamicColors {
  primary: string;
  darkened: string;
  isDark: boolean;
}

const DEFAULT_COLORS: DynamicColors = {
  primary: '#1e1b4b',
  darkened: '#000000',
  isDark: true,
};

export function useDynamicColors(imageUrl?: string): DynamicColors {
  const [colors, setColors] = useState<DynamicColors>(DEFAULT_COLORS);

  useEffect(() => {
    if (!imageUrl) return;

    const fetchColors = async () => {
      try {
        const result = await getColors(imageUrl, {
          fallback: '#1e1b4b',
          cache: true,
          key: imageUrl,
        });

        switch (result.platform) {
          case 'android':
            setColors({
              primary: result.dominant || DEFAULT_COLORS.primary,
              darkened: '#000000',
              isDark: true,
            });
            break;
          case 'ios':
            setColors({
              primary: result.background || DEFAULT_COLORS.primary,
              darkened: '#000000',
              isDark: true,
            });
            break;
          case 'web':
            setColors({
              primary: result.dominant || DEFAULT_COLORS.primary,
              darkened: '#000000',
              isDark: true,
            });
            break;
          default:
            setColors(DEFAULT_COLORS);
        }
      } catch (error) {
        setColors(DEFAULT_COLORS);
      }
    };

    fetchColors();
  }, [imageUrl]);

  return colors;
}
