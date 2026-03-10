import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const SectionHeader = React.memo(({
    title,
    icon,
    accentColor = '#9333ea',
}: {
    title: string;
    icon: React.ReactNode;
    accentColor?: string;
}) => (
    <View style={styles.container}>
        <View style={[styles.iconWrap, { backgroundColor: `${accentColor}18` }]}>
            {icon}
        </View>
        <Text style={styles.title}>{title}</Text>
    </View>
));

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 14,
    },
    iconWrap: {
        width: 32,
        height: 32,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    title: {
        color: '#fff',
        fontSize: 19,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
});
