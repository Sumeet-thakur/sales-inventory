import { useCallback } from 'react';

/**
 * useNumberFormatter hook with default 2 decimal places.
 * @param locale - BCP 47 language tag for formatting (e.g. 'en-US', 'en-IN')
 * @param options - Intl.NumberFormatOptions for customizing grouping/decimals
 *                    defaults to 2 decimal places if not provided
 * @returns formatNumber function
 */
const useNumberFormatter = (
  locale: string = 'en-US',
  options: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 }
) => {
  const formatNumber = useCallback(
    (value: number | string | null | undefined): string => {
      if (value === null || value === undefined || value === '') {
        return '';
      }
      // Strip non-numeric characters (commas, spaces, etc.) when input is string
      const numericString =
        typeof value === 'string'
          ? value.replace(/[^0-9.\-]+/g, '')
          : value.toString();
      const numberValue = parseFloat(numericString);
      if (isNaN(numberValue)) {
        return '';
      }
      // Format number with locale and options (2 decimal places by default)
      return new Intl.NumberFormat(locale, options).format(numberValue);
    },
    [locale, options]
  );

  return formatNumber;
};

export default useNumberFormatter;
