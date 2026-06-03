import { User } from "../models/user.model.js";

export const authCallback = async (req, res, next) => {
	try {
		const { id, firstName, lastName, imageUrl } = req.body;

		// check if user already exists
		const user = await User.findOne({ clerkId: id });

		if (!user) {
			// signup
			const name = `${firstName || ""} ${lastName || ""}`.trim();
			await User.create({
				clerkId: id,
				fullName: name || "User",
				imageUrl: imageUrl || "https://res.cloudinary.com/default-profile.png",
			});
		} else if (!user.fullName || user.fullName === "User" || user.fullName.trim() === "") {
      // Repair hollow user
			const name = `${firstName || ""} ${lastName || ""}`.trim();
			if (name) user.fullName = name;
			if (imageUrl) user.imageUrl = imageUrl;
			await user.save();
    }

		res.status(200).json({ success: true });
	} catch (error) {
		// console.log("Error in auth callback", error);
		next(error);
	}
};