import { useEffect } from 'react';

const useDocumentTitle = (title: string) => {
  useEffect(() => {
    const originalTitle = document.title;
    document.title = title;

    // Revert back to the original title when the component unmounts
    return () => {
      document.title = originalTitle;
    };
  }, [title]);
};

export default useDocumentTitle