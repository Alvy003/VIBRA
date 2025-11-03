import { SignedOut, UserButton } from "@clerk/clerk-react";
import { LayoutDashboardIcon } from "lucide-react";
import { Link } from "react-router-dom";
import SignInOAuthButtons from "./SignInOAuthButtons";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./ui/button";

const Topbar = () => {
	const { isAdmin } = useAuthStore();
	
	return (
			<div
			className="flex items-center justify-between p-4 sticky top-0 bg-zinc-900/75 backdrop-blur-md z-10 text-white"
			>
			<Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity duration-300">
				<img src="/vibra.png" className="w-9 h-9" alt="Vibra logo" />
				<span className="text-lg font-semibold tracking-wide font-[Poppins,sans-serif] hover:text-violet-100 transition-colors duration-300">
				VIBRA
				</span>
			</Link>

			<div className='flex items-center gap-2'>
				{isAdmin && (
					<Link to={"/admin"} className={cn(buttonVariants({ variant: "outline" }),"lg:hover:bg-white/10 transition-colors duration-200")}>
						<LayoutDashboardIcon className='size-4  mr-1' />
						AdminDB
					</Link>
				)}

				<SignedOut>
					<SignInOAuthButtons />
				</SignedOut>

				<UserButton />
			</div>
		</div>
	);
};
export default Topbar;