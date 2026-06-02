import { useEffect, useState } from 'react';
import { getColors } from 'react-native-image-colors';
import { Platform } from 'react-native';

export interface DynamicColors {
  primary: string;
  darkened: string;
  isDark: boolean;
}

const DEFAULT_COLORS: DynamicColors = {
  primary: '#310a5b', // Dark Purple brand fallback
  darkened: '#09090b',
  isDark: true,
};

export function useDynamicColors(imageUrl?: string): DynamicColors {
  const [colors, setColors] = useState<DynamicColors>(DEFAULT_COLORS);

  useEffect(() => {
    if (!imageUrl) return;

    const fetchColors = async () => {
      try {
        const result = await getColors(imageUrl, {
          fallback: '#310a5b',
          cache: true,
          key: imageUrl,
        });

        switch (result.platform) {
          case 'android':
            setColors({
              primary: result.vibrant || result.dominant || DEFAULT_COLORS.primary,
              darkened: '#09090b',
              isDark: true,
            });
            break;
          case 'ios':
            setColors({
              primary: result.background || DEFAULT_COLORS.primary,
              darkened: '#09090b',
              isDark: true,
            });
            break;
          case 'web':
            setColors({
              primary: result.vibrant || result.dominant || DEFAULT_COLORS.primary,
              darkened: '#09090b',
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
