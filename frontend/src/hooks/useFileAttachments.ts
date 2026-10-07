import { useState, useCallback } from "react";

export interface FileAttachment {
  id: string;
  file: File;
  reference: string;
}

export function useFileAttachments(initial: FileAttachment[] = []) {
  const [attachments, setAttachments] = useState<FileAttachment[]>(initial);

  // add new files (no reference yet)
  const addFiles = useCallback((files: FileList) => {
    const newFiles = Array.from(files).map<FileAttachment>((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      reference: "",
    }));
    setAttachments((prev) => [...prev, ...newFiles]);
  }, []);

  // update the "reference" metadata
  const updateReference = useCallback((id: string, reference: string) => {
    setAttachments((prev) =>
      prev.map((att) =>
        att.id === id ? { ...att, reference } : att
      )
    );
  }, []);

  // remove by id
  const removeFile = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  }, []);

  // helper to append all attachments + metadata into a FormData
  const appendToFormData = useCallback(
    (fd: FormData, fieldName = "attachments") => {
      attachments.forEach((att, idx) => {
        fd.append(fieldName, att.file);
        // you can read this on the server as `attachmentsReferences`
        fd.append(
          `attachmentsReferences`,
          att.reference
        );
      });
    },
    [attachments]
  );

  return {
    attachments,
    addFiles,
    updateReference,
    removeFile,
    appendToFormData,
  };
}
