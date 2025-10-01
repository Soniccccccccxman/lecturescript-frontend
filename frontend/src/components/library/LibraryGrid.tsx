import React from 'react';
import type { RecordingEntry } from '../../types/library';
import RecordingCard from './RecordingCard';

interface Theme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  hover: string;
  shadow: string;
}

interface LibraryGridProps {
  theme: Theme;
  recordings: RecordingEntry[];
  onRecordingAction: (action: string, recording: RecordingEntry) => void;
  onAddTag: (recordingId: string, tag: string) => void;
  onRemoveTag: (recordingId: string, tag: string) => void;
}

const LibraryGrid: React.FC<LibraryGridProps> = ({
  theme,
  recordings,
  onRecordingAction,
  onAddTag,
  onRemoveTag
}) => {
  return (
    <div className="p-6">
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {recordings.map((recording) => (
          <RecordingCard
            key={recording.id}
            theme={theme}
            recording={recording}
            onAction={onRecordingAction}
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
          />
        ))}
      </div>
    </div>
  );
};

export default LibraryGrid;