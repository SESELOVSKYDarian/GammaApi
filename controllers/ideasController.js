const pool = require("../db/db");

const getIdeas = async (_req, res) => {
  try {
    const [categoriesRows] = await pool.query(
      "SELECT id, name, image_url FROM idea_categories ORDER BY id"
    );
    const [itemsRows] = await pool.query(
      "SELECT id, category_id, title, type, url, image_url FROM idea_items ORDER BY id"
    );

    const categories = categoriesRows.map((cat) => ({
      id: cat.id,
      name: cat.name,
      imageUrl: cat.image_url,
      cards: itemsRows
        .filter((item) => item.category_id === cat.id)
        .map((item) => ({
          id: item.id,
          title: item.title,
          type: item.type,
          url: item.url,
          imageUrl: item.image_url,
        })),
    }));

    res.json(categories);
  } catch (err) {
    console.error("Error fetching ideas", err);
    res.status(500).json({ error: "Error fetching ideas" });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const imagePath = req.file ? `/ideas/${req.file.filename}` : null;

    const [result] = await pool.query(
      "INSERT INTO idea_categories(name, image_url) VALUES(?, ?)",
      [name, imagePath]
    );

    const [rows] = await pool.query(
      "SELECT id, name, image_url FROM idea_categories WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      id: rows[0].id,
      name: rows[0].name,
      imageUrl: rows[0].image_url,
    });
  } catch (err) {
    console.error("Error creating category", err);
    res.status(500).json({ error: "Error creating category" });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const imagePath = req.file ? `/ideas/${req.file.filename}` : null;

    if (imagePath) {
      const [r] = await pool.query(
        "UPDATE idea_categories SET name=?, image_url=? WHERE id=?",
        [name, imagePath, id]
      );
      if (r.affectedRows === 0) return res.status(404).json({ error: "Category not found" });
    } else {
      const [r] = await pool.query(
        "UPDATE idea_categories SET name=? WHERE id=?",
        [name, id]
      );
      if (r.affectedRows === 0) return res.status(404).json({ error: "Category not found" });
    }

    const [rows] = await pool.query(
      "SELECT id, name, image_url FROM idea_categories WHERE id = ?",
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Category not found" });

    res.json({
      id: rows[0].id,
      name: rows[0].name,
      imageUrl: rows[0].image_url,
    });
  } catch (err) {
    console.error("Error updating category", err);
    res.status(500).json({ error: "Error updating category" });
  }
};

const createItem = async (req, res) => {
  try {
    const { categoryId, title, type, url, imageUrl } = req.body;

    let finalUrl = url;
    if (type === "pdf" && req.files && req.files.file) {
      finalUrl = `/ideas/${req.files.file[0].filename}`;
    }

    const imagePath =
      req.files && req.files.image
        ? `/ideas/${req.files.image[0].filename}`
        : imageUrl;

    const [result] = await pool.query(
      `INSERT INTO idea_items(category_id, title, type, url, image_url)
       VALUES(?, ?, ?, ?, ?)`,
      [categoryId, title, type, finalUrl, imagePath]
    );

    const [rows] = await pool.query(
      "SELECT id, category_id, title, type, url, image_url FROM idea_items WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      id: rows[0].id,
      category_id: rows[0].category_id,
      title: rows[0].title,
      type: rows[0].type,
      url: rows[0].url,
      imageUrl: rows[0].image_url,
    });
  } catch (err) {
    console.error("Error creating item", err);
    res.status(500).json({ error: "Error creating item" });
  }
};

const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, title, type, url, imageUrl } = req.body;

    let finalUrl = url;
    if (type === "pdf" && req.files && req.files.file) {
      finalUrl = `/ideas/${req.files.file[0].filename}`;
    }

    const imagePath =
      req.files && req.files.image
        ? `/ideas/${req.files.image[0].filename}`
        : imageUrl;

    const [r] = await pool.query(
      `UPDATE idea_items
       SET category_id=?, title=?, type=?, url=?, image_url=?
       WHERE id=?`,
      [categoryId, title, type, finalUrl, imagePath, id]
    );

    if (r.affectedRows === 0) return res.status(404).json({ error: "Item not found" });

    const [rows] = await pool.query(
      "SELECT id, category_id, title, type, url, image_url FROM idea_items WHERE id = ?",
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Item not found" });

    res.json({
      id: rows[0].id,
      category_id: rows[0].category_id,
      title: rows[0].title,
      type: rows[0].type,
      url: rows[0].url,
      imageUrl: rows[0].image_url,
    });
  } catch (err) {
    console.error("Error updating item", err);
    res.status(500).json({ error: "Error updating item" });
  }
};

const deleteCategory = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;

    await conn.beginTransaction();

    // Borrar hijos primero para evitar violaciones de FK
    await conn.query("DELETE FROM idea_items WHERE category_id=?", [id]);

    // Borrar categoría
    const [delCat] = await conn.query("DELETE FROM idea_categories WHERE id=?", [
      id,
    ]);

    await conn.commit();

    if (delCat.affectedRows === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.sendStatus(204);
  } catch (err) {
    await conn.rollback();
    console.error("Error deleting category", err);
    res.status(500).json({ error: "Error deleting category" });
  } finally {
    conn.release();
  }
};

const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const [r] = await pool.query("DELETE FROM idea_items WHERE id=?", [id]);

    if (r.affectedRows === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.sendStatus(204);
  } catch (err) {
    console.error("Error deleting item", err);
    res.status(500).json({ error: "Error deleting item" });
  }
};

module.exports = {
  getIdeas,
  createCategory,
  updateCategory,
  createItem,
  updateItem,
  deleteCategory,
  deleteItem,
};
