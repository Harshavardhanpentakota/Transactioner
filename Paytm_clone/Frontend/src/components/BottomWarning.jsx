export const BottomWarning = ({ label, buttonText, to }) => {
  <div className="py-2 text-sm flex justify-center">
    <div>{label}</div>
    <Link className="pointer underline p1-1 cursor-pointer" to={to}>
      {buttonText}
    </Link>
  </div>;
};
