const express = require('express');
const prisma = require('../prismaClient');
const { handleError, toNumber } = require('./helpers');

const router = express.Router();

function formatMaterial(material) {
    return {
        id: material.id,
        name: material.name,
        usefulLife: material.useful_life,
        costPerM2: Number(material.cost_per_m2),
        permeability: Number(material.permeability)
    };
}

router.get('/', async (_req, res) => {
    try {
        const materials = await prisma.materials.findMany({
            orderBy: { id: 'asc' }
        });

        res.json({
            ok: true,
            materials: materials.map(formatMaterial)
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.get('/:id', async (req, res) => {
    try {
        const id = toNumber(req.params.id);
        if (!id) return res.status(400).json({ ok: false, message: 'ID invalido.' });

        const material = await prisma.materials.findUnique({ where: { id } });
        if (!material) return res.status(404).json({ ok: false, message: 'Material no encontrado.' });

        res.json({
            ok: true,
            material: formatMaterial(material)
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.formatMaterial = formatMaterial;

module.exports = router;
