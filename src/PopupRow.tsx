import { FC } from "react";

export const PopupRow: FC<{ label: string; text: string }> = ({
  label,
  text,
}) => {
  if (/^https?:\/\//.test(text)) {
    return (
      <div className="popup-row">
        <div className="label">{label}:</div>{" "}
        <a href={text} target="_blank" rel="noreferrer">
          here
        </a>
      </div>
    );
  }

  return (
    <div className="popup-row">
      <div className="label">{label}:</div> <div>{text}</div>
    </div>
  );
};
