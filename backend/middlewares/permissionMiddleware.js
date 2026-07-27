export const permissionMiddleware = (sport, action) => {
  return (req, res, next) => {
    const permissionCode = `${sport}_${action}`;

    if (!req.user?.permissions?.includes(permissionCode)) {
      return res.status(403).json({
        success: false,
        message: `Missing permission: ${permissionCode}`,
      });
    }

    next();
  };
};