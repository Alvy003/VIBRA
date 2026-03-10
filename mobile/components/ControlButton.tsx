import React from 'react';
import { TouchableOpacity, StyleProp, ViewStyle, StyleSheet } from 'react-native';

interface ControlButtonProps {
    onPress: () => void;
    children: React.ReactNode;
    size?: 'small' | 'medium' | 'large' | 'xl';
    variant?: 'ghost' | 'solid';
    style?: StyleProp<ViewStyle>;
}

const ControlButton = React.memo(({
    onPress,
    children,
    size = 'medium',
    variant = 'ghost',
    style
}: ControlButtonProps) => {

    const handlePress = () => {
        onPress();
    };

    const getSizeStyle = () => {
        switch (size) {
            case 'small': return styles.buttonSmall;
            case 'large': return styles.buttonLarge;
            case 'xl': return styles.buttonXl;
            case 'medium':
            default: return styles.buttonMedium;
        }
    };

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={handlePress}
            style={[
                styles.buttonBase,
                getSizeStyle(),
                variant === 'solid' && styles.buttonSolid,
                style
            ]}
        >
            {children}
        </TouchableOpacity>
    );
});

ControlButton.displayName = 'ControlButton';
export default ControlButton;

const styles = StyleSheet.create({
    buttonBase: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonSmall: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    buttonMedium: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    buttonLarge: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    buttonXl: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    buttonSolid: {
        backgroundColor: '#fff',
    }
});
