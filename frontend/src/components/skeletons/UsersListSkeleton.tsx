const UsersListSkeleton = () => {
	return (
	  <>
		{Array.from({ length: 8 }).map((_, i) => (
		  <div 
			key={i} 
			className="flex items-center gap-3 py-2.5 px-3 rounded-lg"
		  >
			{/* Avatar skeleton */}
			<div className="relative shrink-0">
			  <div className="h-11 w-11 rounded-full bg-zinc-800/80 animate-pulse" />
			  {/* Online indicator skeleton */}
			  <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-zinc-700 ring-2 ring-[#121318]" />
			</div>
			
			{/* Content skeleton */}
			<div className="flex-1 min-w-0 flex justify-between items-start">
			  <div className="flex-1 min-w-0 space-y-2">
				{/* Name skeleton - varied widths */}
				<div 
				  className="h-4 bg-zinc-800/80 rounded animate-pulse" 
				  style={{ width: `${60 + (i % 4) * 20}px` }}
				/>
				{/* Message preview skeleton */}
				<div className="flex items-center gap-1.5">
				  {/* Tick skeleton (sometimes) */}
				  {i % 3 === 0 && (
					<div className="h-3 w-3 bg-zinc-800/60 rounded animate-pulse" />
				  )}
				  <div 
					className="h-3 bg-zinc-800/60 rounded animate-pulse" 
					style={{ width: `${80 + (i % 5) * 15}px` }}
				  />
				</div>
			  </div>
			  
			  {/* Right side - time & badge */}
			  <div className="flex flex-col items-end ml-2 shrink-0 gap-1">
				{/* Time skeleton */}
				<div className="h-3 w-10 bg-zinc-800/60 rounded animate-pulse" />
				{/* Badge skeleton (sometimes) */}
				{i % 4 === 0 && (
				  <div className="h-[18px] w-[18px] bg-violet-600/30 rounded-full animate-pulse" />
				)}
			  </div>
			</div>
		  </div>
		))}
	  </>
	);
  };
  
  export default UsersListSkeleton;