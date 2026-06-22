function DetailLine({ label, name, value, isEditing, onChange, type = 'text' }) {
  return (
    <label className={`detail-line${isEditing ? ' detail-line--editing' : ''}`}>
      <span>{label}</span>
      <span className="detail-arrow">&gt;</span>
      <input
        name={name}
        type={isEditing ? type : 'text'}
        value={value ?? ''}
        placeholder={type === 'date' ? '' : 'Not set'}
        readOnly={!isEditing}
        onChange={onChange}
      />
    </label>
  );
}

export default DetailLine;
