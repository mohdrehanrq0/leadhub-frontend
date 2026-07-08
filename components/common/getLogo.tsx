"use client";
import React from "react";

type IProps = {
  className?: string;
  height?: string;
  width?: string;
  color?: string;
};

const GetLogo = ({
  className = "",
  height = "32",
  width = "32",
  color = "#3b82f6",
}: IProps) => {
  return (
    <div className={className}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    </div>
  );
};

export default GetLogo;
