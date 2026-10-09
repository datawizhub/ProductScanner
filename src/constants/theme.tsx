import '@/global.css';

import { createContext, ReactNode, useContext, useMemo } from 'react';
import { Platform, useColorScheme } from 'react-native';

export const Colors = 
{
    light: 
    {
        text: '#1a1a1a',
        background: '#ffffff',
        backgroundElement: '#eee6a4',
        backgroundSelected: '#ffe9a8',
        textSecondary: '#7b7f8a',
        primary: '#fdbf2d',
        primaryText: '#1a1a1a',
        danger: '#e8304a',
        accent: '#b45309',
    },

    dark: 
    {
        text: '#fff4e6',
        background: '#15110d',
        backgroundElement: '#5f462d',
        backgroundSelected: '#3a2b1c',
        textSecondary: '#b8a590',
        primary: '#94561b',
        primaryText: '#d2cfcf',
        danger: '#ff6b6b',
        accent: '#ffa04d',
    },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select
({
    ios: 
    {
        /** iOS `UIFontDescriptorSystemDesignDefault` */
        sans: 'system-ui',
        /** iOS `UIFontDescriptorSystemDesignSerif` */
        serif: 'ui-serif',
        /** iOS `UIFontDescriptorSystemDesignRounded` */
        rounded: 'ui-rounded',
        /** iOS `UIFontDescriptorSystemDesignMonospaced` */
        mono: 'ui-monospace',
    },

    default: 
    {
        sans: 'normal',
        serif: 'serif',
        rounded: 'normal',
        mono: 'monospace',
    },

    web: 
    {
        sans: 'var(--font-display)',
        serif: 'var(--font-serif)',
        rounded: 'var(--font-rounded)',
        mono: 'var(--font-mono)',
    },
});

export const Spacing = 
{
    half: 2,
    one: 4,
    two: 8,
    three: 16,
    four: 24,
    five: 32,
    six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export type ThemeColors = 
{
    [K in keyof typeof Colors.light]: string;
};

type Theme = 
{
    colors: ThemeColors;
    scheme: 'light' | 'dark';
    isDark: boolean;
    fonts: NonNullable<typeof Fonts>;
    spacing: typeof Spacing;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeContextProvider({ children }: { children: ReactNode }) 
{
    const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

    const value = useMemo<Theme>
    (
        () => ({
        colors: Colors[scheme],
        scheme,
        isDark: scheme === 'dark',
        fonts: Fonts!,
        spacing: Spacing,
        }),
        [scheme]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() 
{
    const ctx = useContext(ThemeContext);
    if (!ctx) 
    {
        throw new Error('useTheme must be used inside <ThemeContextProvider>');
    }
    return ctx;
}
