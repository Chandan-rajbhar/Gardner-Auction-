import React from 'react';
import { Coins, Boxes, Gem, Clock, Palette, Award } from 'lucide-react';
import { DEPARTMENTS } from '../data/auctionData';

interface DepartmentDirectoryProps {
  selectedDepartment: string;
  onSelectDepartment: (deptName: string) => void;
}

export const DepartmentDirectory: React.FC<DepartmentDirectoryProps> = ({
  selectedDepartment,
  onSelectDepartment
}) => {
  const getDeptIcon = (iconName: string) => {
    switch (iconName) {
      case 'Coins':
        return <Coins size={26} className="dept-icon" />;
      case 'Boxes':
        return <Boxes size={26} className="dept-icon" />;
      case 'Gem':
        return <Gem size={26} className="dept-icon" />;
      case 'Clock':
        return <Clock size={26} className="dept-icon" />;
      case 'Palette':
        return <Palette size={26} className="dept-icon" />;
      case 'Award':
        return <Award size={26} className="dept-icon" />;
      default:
        return <Coins size={26} className="dept-icon" />;
    }
  };

  return (
    <section id="departments" className="department-directory-section">
      <div className="section-container container-fluid">
        {/* Header */}
        <div className="dept-header-center">
          <span className="section-eyebrow">CATALOG DIRECTORY</span>
          <h2 className="section-main-title">Browse by Department</h2>
          <p className="section-subtitle">
            Over 1,420 cataloged lots currently active and authenticated across 6 specialist-appraised divisions.
          </p>
        </div>

        {/* 6 Departments Grid */}
        <div className="departments-grid">
          {DEPARTMENTS.map((dept) => {
            const isSelected = selectedDepartment === dept.name;

            return (
              <div
                key={dept.id}
                className={`dept-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectDepartment(isSelected ? 'all' : dept.name)}
                role="button"
                tabIndex={0}
              >
                <div className="dept-icon-wrapper">
                  {getDeptIcon(dept.iconName)}
                </div>
                <h3 className="dept-name">{dept.name}</h3>
                <span className="dept-lots-count">{dept.lotsCount} Lots</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
