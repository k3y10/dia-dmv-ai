// BloodSugar.tsx
import React from 'react';

interface BloodSugarProps {
  value: number;
}

const BloodSugar: React.FC<BloodSugarProps> = ({ value }) => {
  return (
    <div>
      <p>Blood Sugar Level: {value}</p>
    </div>
  );
};

export default BloodSugar;
