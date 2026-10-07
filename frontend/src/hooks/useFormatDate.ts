import { useCallback } from 'react';

const useFormatDate = (): ((dateString: string) => string) => {
  const formatDate = useCallback((dateString: string): string => {
    if (!dateString.trim()) {
      return '';
    }

    const date = new Date(dateString);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  }, []);

  return formatDate;
};

export default useFormatDate;
