import React from "react";

interface IProps {
  children: React.ReactNode;
  id: string;
  arrow?: boolean;
}

const Tooltip = ({ children, id, arrow = false }: IProps) => {
  // NOTE: always add this attribute to the target button with the same {id} that is provided
  //  data-tooltip-target={id}

  return (
    <div
      id={id}
      role="tooltip"
      className="absolute z-10 max-w-96 invisible inline-block px-3 py-2 text-sm font-medium text-text transition-opacity duration-300 bg-bg-200 rounded-lg shadow-md opacity-0 tooltip "
    >
      {children}
      {arrow ? <div className="tooltip-arrow" data-popper-arrow></div> : ""}
    </div>
  );
};

export default Tooltip;
