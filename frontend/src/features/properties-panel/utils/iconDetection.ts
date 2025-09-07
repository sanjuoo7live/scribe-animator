// Helper function to detect if text contains unicode icons/emojis
export const isIconText = (text: string): boolean => {
  if (!text) return false;
  // Check if text contains emoji/unicode symbols (ES5 compatible)
  // Common emoji ranges and symbols
  const emojiRanges = [
    /[\uD83C-\uDBFF\uDC00-\uDFFF]+/g, // Emoji ranges
    /[\u2600-\u26FF]/g,               // Miscellaneous symbols
    /[\u2700-\u27BF]/g,               // Dingbats
    /[\u2190-\u21FF]/g,               // Arrows
    /[\u25A0-\u25FF]/g,               // Geometric shapes
    /[\u2B00-\u2BFF]/g,               // Miscellaneous symbols and arrows
    /[\u00A0-\u00FF]/g,               // Latin-1 supplement (includes ©, ®)
    /[\u2000-\u206F]/g,               // General punctuation (includes ™)
  ];
  
  return emojiRanges.some(regex => regex.test(text)) || 
         (text.length === 1 && text.charCodeAt(0) > 127); // Extended ASCII and above
};
