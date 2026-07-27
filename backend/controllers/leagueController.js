import { prisma } from "../config/db.js";

export const createLeague = async (req, res) => {
  try {
    const { name, logo, season, visibility, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "League name is required",
      });
    }

    if (visibility && !["PUBLIC", "PRIVATE"].includes(visibility)) {
      return res.status(400).json({
        success: false,
        message: "Visibility must be PUBLIC or PRIVATE",
      });
    }

    const footballSport = await prisma.sport.findUnique({
      where: {
        code: "FOOTBALL",
      },
    });

    if (!footballSport) {
      return res.status(404).json({
        success: false,
        message: "Football sport not found",
      });
    }

    if (!footballSport.isEnabled) {
      return res.status(403).json({
        success: false,
        message: "Football is currently disabled",
      });
    }

    const league = await prisma.league.create({
      data: {
        name,
        logo: logo || null,
        season: season || null,
        description: description || null,
        visibility: visibility || "PRIVATE",
        sportId: footballSport.id,
        createdById: req.user.id,
      },
      include: {
        sport: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "League created successfully",
      data: league,
    });
  } catch (error) {
    console.log("Error in createLeague:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};