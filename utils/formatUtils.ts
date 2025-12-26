export const formatCount = (count: number): string => {
    if (count === undefined || count === null) return '0';
    if (count >= 1000000000) {
        return (count / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (count >= 1000) {
        return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return count.toString();
};
