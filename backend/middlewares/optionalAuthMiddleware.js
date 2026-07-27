import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";

export const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      req.user = null;
      return next();
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      req.user = null;
      return next();
    }

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        dateOfBirth: true,
        bio: true,
        workplace: true,
        school: true,
        image: true,
        role: true,
        permissions: {
          select: {
            permission: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      req.user = null;
      return next();
    }

    req.user = {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      dateOfBirth: user.dateOfBirth,
      bio: user.bio,
      workplace: user.workplace,
      school: user.school,
      image: user.image,
      role: user.role,
      permissions: user.permissions.map((item) => item.permission.code),
    };

    return next();
  } catch (error) {
    req.user = null;
    return next();
  }
};
