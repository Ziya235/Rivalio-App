import bcrypt from "bcrypt";
import { prisma } from "../config/db.js";
import { generateToken } from "../utils/generateToken.js";

const ADMIN_DEFAULT_PERMISSIONS = [
  {
    code: "football_view",
    description: "Can view football data",
  },
  {
    code: "football_create",
    description: "Can create football data",
  },
  {
    code: "football_update",
    description: "Can update football data",
  },
];

const USERNAME_REGEX = /^[a-z0-9._]{3,30}$/;

const userSelect = {
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
  gamesPlayed: true,
  goals: true,
  assists: true,
  permissions: {
    select: {
      permission: {
        select: {
          code: true,
        },
      },
    },
  },
};

const formatUser = (user) => ({
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
  gamesPlayed: user.gamesPlayed ?? 0,
  goals: user.goals ?? 0,
  assists: user.assists ?? 0,
  permissions: user.permissions.map((item) => item.permission.code),
});

const optionalText = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const register = async (req, res) => {
  try {
    const {
      username,
      firstName,
      lastName,
      email,
      password,
      dateOfBirth,
      dob,
      bio,
      workplace,
      school,
      role,
    } = req.body;

    const birthDateRaw = dateOfBirth || dob;

    if (
      !username ||
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !birthDateRaw
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    const normalizedUsername = String(username).trim().toLowerCase();

    if (!USERNAME_REGEX.test(normalizedUsername)) {
      return res.status(400).json({
        success: false,
        message:
          "Username must be 3–30 characters: lowercase letters, numbers, dots and underscores only",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const parsedDateOfBirth = new Date(birthDateRaw);
    if (Number.isNaN(parsedDateOfBirth.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date of birth",
      });
    }

    if (parsedDateOfBirth > new Date()) {
      return res.status(400).json({
        success: false,
        message: "Date of birth cannot be in the future",
      });
    }

    const userRole = role === "ADMIN" ? "ADMIN" : "USER";

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { username: normalizedUsername }],
      },
    });

    if (existingUser) {
      const conflictField =
        existingUser.email === normalizedEmail ? "email" : "username";

      return res.status(409).json({
        success: false,
        message:
          conflictField === "email"
            ? "User with this email already exists"
            : "Username is already taken",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: normalizedUsername,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          passwordHash,
          dateOfBirth: parsedDateOfBirth,
          bio: optionalText(bio),
          workplace: optionalText(workplace),
          school: optionalText(school),
          role: userRole,
        },
      });

      if (userRole === "ADMIN") {
        const permissions = [];

        for (const permission of ADMIN_DEFAULT_PERMISSIONS) {
          const upserted = await tx.permission.upsert({
            where: { code: permission.code },
            update: {},
            create: permission,
          });
          permissions.push(upserted);
        }

        await tx.userPermission.createMany({
          data: permissions.map((permission) => ({
            userId: user.id,
            permissionId: permission.id,
          })),
          skipDuplicates: true,
        });
      }

      return tx.user.findUnique({
        where: {
          id: user.id,
        },
        select: userSelect,
      });
    });

    const token = generateToken(result);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: formatUser(result),
        token,
      },
    });
  } catch (error) {
    console.log("Register error:", error);

    if (error?.code === "P2002") {
      const target = error?.meta?.target;
      const isUsername = Array.isArray(target)
        ? target.includes("username")
        : String(target || "").includes("username");

      return res.status(409).json({
        success: false,
        message: isUsername
          ? "Username is already taken"
          : "User with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: formatUser(user),
        token,
      },
    });
  } catch (error) {
    console.log("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const me = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const {
      username,
      firstName,
      lastName,
      email,
      dateOfBirth,
      dob,
      bio,
      workplace,
      school,
      image,
    } = req.body;

    const birthDateRaw = dateOfBirth || dob;

    if (!username || !firstName || !lastName || !email || !birthDateRaw) {
      return res.status(400).json({
        success: false,
        message: "Required profile fields are missing",
      });
    }

    const normalizedUsername = String(username).trim().toLowerCase();

    if (!USERNAME_REGEX.test(normalizedUsername)) {
      return res.status(400).json({
        success: false,
        message:
          "Username must be 3–30 characters: lowercase letters, numbers, dots and underscores only",
      });
    }

    const parsedDateOfBirth = new Date(birthDateRaw);
    if (Number.isNaN(parsedDateOfBirth.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date of birth",
      });
    }

    if (parsedDateOfBirth > new Date()) {
      return res.status(400).json({
        success: false,
        message: "Date of birth cannot be in the future",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const userId = req.user.id;

    const conflict = await prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { username: normalizedUsername }],
        NOT: { id: userId },
      },
    });

    if (conflict) {
      const conflictField =
        conflict.email === normalizedEmail ? "email" : "username";

      return res.status(409).json({
        success: false,
        message:
          conflictField === "email"
            ? "User with this email already exists"
            : "Username is already taken",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username: normalizedUsername,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: normalizedEmail,
        dateOfBirth: parsedDateOfBirth,
        bio: optionalText(bio),
        workplace: optionalText(workplace),
        school: optionalText(school),
        ...(image !== undefined ? { image: optionalText(image) } : {}),
      },
      select: userSelect,
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: formatUser(updatedUser),
      },
    });
  } catch (error) {
    console.log("Update profile error:", error);

    if (error?.code === "P2002") {
      const target = error?.meta?.target;
      const isUsername = Array.isArray(target)
        ? target.includes("username")
        : String(target || "").includes("username");

      return res.status(409).json({
        success: false,
        message: isUsername
          ? "Username is already taken"
          : "User with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required",
      });
    }

    const imagePath = `/uploads/${req.file.filename}`;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { image: imagePath },
      select: userSelect,
    });

    return res.status(200).json({
      success: true,
      message: "Profile image updated successfully",
      data: {
        user: formatUser(updatedUser),
      },
    });
  } catch (error) {
    console.log("Update profile image error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
