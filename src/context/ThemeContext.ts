import { createContext } from 'react';
import type { ThemeContextType } from '../types/Theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export default ThemeContext;
