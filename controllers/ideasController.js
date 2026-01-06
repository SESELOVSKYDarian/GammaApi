const pool = require('../db/db');

const getIdeas = async (_req, res) => {
  try {
    const categoriesRes = await pool.query(
      'SELECT id, name, image_url FROM idea_categories ORDER BY id'
    );
    const itemsRes = await pool.query(
      'SELECT id, category_id, title, type, url, image_url FROM idea_items ORDER BY id'
    );

    const categories = categoriesRes.rows.map((cat) => ({
      id: cat.id,
      name: cat.name,
      imageUrl: cat.image_url,
      cards: itemsRes.rows
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
    console.error('Error fetching ideas', err);
    res.status(500).json({ error: 'Error fetching ideas' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const imagePath = req.file ? `/ideas/${req.file.filename}` : null;
    const result = await pool.query(
      'INSERT INTO idea_categories(name, image_url) VALUES(?, ?)',
      [name, imagePath]
    );
    const created = await pool.query('SELECT id, name, image_url FROM idea_categories WHERE id = ?', [result.insertId]);
    const category = created.rows[0];
    if (!category) return res.status(500).json({ error: 'Error creating category' });
    res.status(201).json({ id: category.id, name: category.name, imageUrl: category.image_url });
  } catch (err) {
    console.error('Error creating category', err);
    res.status(500).json({ error: 'Error creating category' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const imagePath = req.file ? `/ideas/${req.file.filename}` : null;
    const fields = [name];
    let query = 'UPDATE idea_categories SET name=?';
    if (imagePath) {
      query += ', image_url=? WHERE id=?';
      fields.push(imagePath, id);
    } else {
      query += ' WHERE id=?';
      fields.push(id);
    }
    await pool.query(query, fields);
    const fetched = await pool.query('SELECT id, name, image_url FROM idea_categories WHERE id = ?', [id]);
    if (!fetched.rows.length) return res.status(404).json({ error: 'Category not found' });
    res.json({ id: fetched.rows[0].id, name: fetched.rows[0].name, imageUrl: fetched.rows[0].image_url });
  } catch (err) {
    console.error('Error updating category', err);
    res.status(500).json({ error: 'Error updating category' });
  }
};

const createItem = async (req, res) => {
  try {
    const { categoryId, title, type, url, imageUrl } = req.body;
    let finalUrl = url;
    if (type === 'pdf' && req.files && req.files.file) {
      finalUrl = `/ideas/${req.files.file[0].filename}`;
    }
    const imagePath = req.files && req.files.image
      ? `/ideas/${req.files.image[0].filename}`
      : imageUrl;
    const result = await pool.query(
      `INSERT INTO idea_items(category_id, title, type, url, image_url)
       VALUES(?, ?, ?, ?, ?)`,
      [categoryId, title, type, finalUrl, imagePath]
    );
    const inserted = await pool.query(
      'SELECT id, category_id, title, type, url, image_url FROM idea_items WHERE id = ?',
      [result.insertId]
    );
    if (!inserted.rows[0]) return res.status(500).json({ error: 'Error creating item' });
    res.status(201).json({
      id: inserted.rows[0].id,
      category_id: inserted.rows[0].category_id,
      title: inserted.rows[0].title,
      type: inserted.rows[0].type,
      url: inserted.rows[0].url,
      imageUrl: inserted.rows[0].image_url,
    });
  } catch (err) {
    console.error('Error creating item', err);
    res.status(500).json({ error: 'Error creating item' });
  }
};

const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, title, type, url, imageUrl } = req.body;
    let finalUrl = url;
    if (type === 'pdf' && req.files && req.files.file) {
      finalUrl = `/ideas/${req.files.file[0].filename}`;
    }
    const imagePath = req.files && req.files.image
      ? `/ideas/${req.files.image[0].filename}`
      : imageUrl;
    await pool.query(
      `UPDATE idea_items SET category_id=?, title=?, type=?, url=?, image_url=? WHERE id=?`,
      [categoryId, title, type, finalUrl, imagePath, id]
    );
    const result = await pool.query(
      'SELECT id, category_id, title, type, url, image_url FROM idea_items WHERE id = ?',
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Item not found' });
    res.json({
      id: result.rows[0].id,
      category_id: result.rows[0].category_id,
      title: result.rows[0].title,
      type: result.rows[0].type,
      url: result.rows[0].url,
      imageUrl: result.rows[0].image_url,
    });
  } catch (err) {
    console.error('Error updating item', err);
    res.status(500).json({ error: 'Error updating item' });
  }
};

const deleteCategory = async (req, res) => {
  const client = await pool.getConnection();
  try {
    const { id } = req.params;

    await client.beginTransaction();
    // Borrar hijos primero para evitar violaciones de FK
    await client.query('DELETE FROM idea_items WHERE category_id=?', [id]);
    // Borrar la categoría
    const delCat = await client.query('DELETE FROM idea_categories WHERE id=?', [id]);
    await client.commit();

    if (delCat.rowCount === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.sendStatus(204);
  } catch (err) {
    await client.rollback();
    console.error('Error deleting category', err);
    res.status(500).json({ error: 'Error deleting category' });
  } finally {
    client.release();
  }
};

const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM idea_items WHERE id=?', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting item', err);
    res.status(500).json({ error: 'Error deleting item' });
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
