export const parseUTCDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
    return new Date(dateStr + 'Z');
  }
  return new Date(dateStr);
};
