function UpdateNoticeDialog({ notice, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="notice-window" role="dialog" aria-modal="true" aria-labelledby="update-notice-title">
        <div className="notice-window__tab">Update Complete</div>
        <div className="notice-window__body">
          <h2 id="update-notice-title">{notice.title}</h2>
          <p className="notice-window__subtitle">{notice.subtitle}</p>
          <ul>
            {notice.summary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <button className="window-update-button" type="button" onClick={onClose}>
            OK
          </button>
        </div>
      </section>
    </div>
  );
}

export default UpdateNoticeDialog;
