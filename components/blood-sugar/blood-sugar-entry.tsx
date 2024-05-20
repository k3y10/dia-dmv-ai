// BloodSugarEntry.tsx
import React from 'react';

interface BloodSugarEntryProps {
  time: string;
  level: number;
  status: string;
}

const BloodSugarEntry: React.FC<BloodSugarEntryProps> = ({ time, level, status }) => {
  return (
    <div>
      <p>Time: {time}</p>
      <p>Blood Sugar Level: {level}</p>
      <p>Status: {status}</p>
    </div>
  );
};

export default BloodSugarEntry;
