function StatusSelectLine({ value, isEditing, onChange }) {
  return (
    <label className={`detail-line${isEditing ? ' detail-line--editing' : ''}`}>
      <span>Status</span>
      <span className="detail-arrow">&gt;</span>
      <select name="roomStatus" value={value} disabled={!isEditing} onChange={onChange}>
        <option value="available">Available</option>
        <option value="occupied">Occupied</option>
        <option value="unavailable">Unavailable</option>
      </select>
    </label>
  );
}

export default StatusSelectLine;
