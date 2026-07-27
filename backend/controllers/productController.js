import { prisma } from "../config/db.js";

export const getAllProducts = async (req, res) => {
  try {
    const products = await prisma.products.findMany({
      orderBy: {
        created_at: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Error in getAllProducts:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getProduct = async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid product id",
    });
  }

  try {
    const product = await prisma.products.findUnique({
      where: {
        id,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Error in getProduct:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const createProduct = async (req, res) => {
  const { name, price, image } = req.body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof image !== "string" ||
    !image.trim() ||
    price === undefined ||
    price === null ||
    Number.isNaN(Number(price)) ||
    Number(price) <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid name, price and image are required",
    });
  }

  try {
    const newProduct = await prisma.products.create({
      data: {
        name: name.trim(),
        price: Number(price),
        image: image.trim(),
      },
    });

    return res.status(201).json({
      success: true,
      data: newProduct,
    });
  } catch (error) {
    console.error("Error in createProduct:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateProduct = async (req, res) => {
  const id = Number(req.params.id);
  const { name, price, image } = req.body;

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid product id",
    });
  }

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof image !== "string" ||
    !image.trim() ||
    price === undefined ||
    price === null ||
    Number.isNaN(Number(price)) ||
    Number(price) <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid name, price and image are required",
    });
  }

  try {
    const existingProduct = await prisma.products.findUnique({
      where: {
        id,
      },
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const updatedProduct = await prisma.products.update({
      where: {
        id,
      },
      data: {
        name: name.trim(),
        price: Number(price),
        image: image.trim(),
      },
    });

    return res.status(200).json({
      success: true,
      data: updatedProduct,
    });
  } catch (error) {
    console.error("Error in updateProduct:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteProduct = async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid product id",
    });
  }

  try {
    const existingProduct = await prisma.products.findUnique({
      where: {
        id,
      },
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await prisma.products.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteProduct:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
