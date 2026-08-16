const Loading = () => {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[70vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-lucasPurple border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-400">Đang tải...</span>
      </div>
    </div>
  );
};

export default Loading;
