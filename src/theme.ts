import type { Theme } from './types.ts';

export const isTheme = (x: unknown): x is Theme => x === 'dark' || x === 'light';

export const toggleTheme = (current: Theme): Theme => (current === 'dark' ? 'light' : 'dark');

export const resolveInitialTheme = (stored: string | null, prefersDark: boolean): Theme => {
  if (isTheme(stored)) return stored;
  return prefersDark ? 'dark' : 'light';
};

export interface MermaidThemeVars {
  primaryColor: string;
  primaryTextColor: string;
  primaryBorderColor?: string;
  lineColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  background?: string;
  mainBkg?: string;
  nodeBorder?: string;
  clusterBkg?: string;
  clusterBorder?: string;
  titleColor?: string;
  edgeLabelBackground?: string;
}

export const mermaidThemeVars = (theme: Theme): MermaidThemeVars =>
  theme === 'dark'
    ? {
        primaryColor: '#7c3aed',
        primaryTextColor: '#e4e4e7',
        primaryBorderColor: '#3a3a42',
        lineColor: '#636370',
        secondaryColor: '#232328',
        tertiaryColor: '#141416',
        background: '#101012',
        mainBkg: '#1a1a1e',
        nodeBorder: '#3a3a42',
        clusterBkg: '#141416',
        clusterBorder: '#232328',
        titleColor: '#e4e4e7',
        edgeLabelBackground: '#141416',
      }
    : {
        primaryColor: '#7c3aed',
        primaryTextColor: '#1a1a2e',
      };

export const mermaidThemeName = (theme: Theme): 'dark' | 'default' =>
  theme === 'dark' ? 'dark' : 'default';
