import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Helper to map Prisma document + items to the frontend-expected format
   */
  private formatDocument(doc: any) {
    const { items, ...rest } = doc;
    return {
      ...rest,
      table: items
        ? items.map((item: any) => ({
            id: item.id,
            sum: item.sum,
            count: item.count,
          }))
        : [],
    };
  }

  /**
   * Get all documents (ordered latest first)
   */
  async findAll(search?: string) {
    const whereClause: any = {};

    if (search && search.trim()) {
      const s = search.trim();
      whereClause.OR = [
        { companyName: { contains: s, mode: 'insensitive' } },
        { contractNumber: { contains: s, mode: 'insensitive' } },
        { requisites: { contains: s, mode: 'insensitive' } },
        { contractorNumber: { contains: s, mode: 'insensitive' } },
        { orderNumber: { contains: s, mode: 'insensitive' } },
        { deliveryNumber: { contains: s, mode: 'insensitive' } },
        { invoiceNumber: { contains: s, mode: 'insensitive' } },
        { phoneNumber: { contains: s, mode: 'insensitive' } },
        { contract: { contains: s, mode: 'insensitive' } },
        { notes: { contains: s, mode: 'insensitive' } },
      ];
    }

    const documents = await this.prisma.document.findMany({
      where: whereClause,
      include: {
        items: {
          orderBy: { id: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return documents.map((doc) => this.formatDocument(doc));
  }

  /**
   * Get a single document by ID
   */
  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Document #${id} not found`);
    }

    return this.formatDocument(doc);
  }

  /**
   * Generate next sequential 3-digit ID ('001', '002', ...)
   */
  async getNextId(): Promise<string> {
    const existing = await this.prisma.document.findMany({
      select: { id: true },
    });

    let nextNum = 1;
    if (existing.length > 0) {
      const numbers = existing
        .map((d) => d.id)
        .filter((id) => /^\d+$/.test(id))
        .map((id) => parseInt(id, 10));

      if (numbers.length > 0) {
        nextNum = Math.max(...numbers) + 1;
      }
    }

    return nextNum.toString().padStart(3, '0');
  }

  /**
   * Create a new document with items
   */
  async create(dto: CreateDocumentDto) {
    let id = dto.id;
    if (!id) {
      id = await this.getNextId();
    }

    const created = await this.prisma.document.create({
      data: {
        id,
        contractNumber: dto.contractNumber,
        date: dto.date,
        companyName: dto.companyName,
        position: dto.position,
        fullName: dto.fullName,
        documentBasis: dto.documentBasis,
        requisites: dto.requisites,
        total: dto.total,
        contractorNumber: dto.contractorNumber || null,
        orderNumber: dto.orderNumber || null,
        deliveryNumber: dto.deliveryNumber || null,
        invoiceNumber: dto.invoiceNumber || null,
        phoneNumber: dto.phoneNumber || null,
        contract: dto.contract || null,
        notes: dto.notes || null,
        rowBgColor: dto.rowBgColor || '#ffffff',
        notesBgColor: dto.notesBgColor || '#ffffff',
        items: {
          create: (dto.table || []).map((row) => ({
            sum: Number(row.sum) || 0,
            count: Number(row.count) || 0,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return this.formatDocument(created);
  }

  /**
   * Update an existing document
   */
  async update(id: string, dto: UpdateDocumentDto) {
    await this.findOne(id); // Ensure existence

    const updateData: any = {};
    if (dto.contractNumber !== undefined) updateData.contractNumber = dto.contractNumber;
    if (dto.date !== undefined) updateData.date = dto.date;
    if (dto.companyName !== undefined) updateData.companyName = dto.companyName;
    if (dto.position !== undefined) updateData.position = dto.position;
    if (dto.fullName !== undefined) updateData.fullName = dto.fullName;
    if (dto.documentBasis !== undefined) updateData.documentBasis = dto.documentBasis;
    if (dto.requisites !== undefined) updateData.requisites = dto.requisites;
    if (dto.total !== undefined) updateData.total = dto.total;
    if (dto.contractorNumber !== undefined) updateData.contractorNumber = dto.contractorNumber;
    if (dto.orderNumber !== undefined) updateData.orderNumber = dto.orderNumber;
    if (dto.deliveryNumber !== undefined) updateData.deliveryNumber = dto.deliveryNumber;
    if (dto.invoiceNumber !== undefined) updateData.invoiceNumber = dto.invoiceNumber;
    if (dto.phoneNumber !== undefined) updateData.phoneNumber = dto.phoneNumber;
    if (dto.contract !== undefined) updateData.contract = dto.contract;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.rowBgColor !== undefined) updateData.rowBgColor = dto.rowBgColor;
    if (dto.notesBgColor !== undefined) updateData.notesBgColor = dto.notesBgColor;

    // Handle table items update if provided
    if (dto.table && Array.isArray(dto.table)) {
      // Delete old items and insert updated items in a transaction
      await this.prisma.$transaction([
        this.prisma.documentItem.deleteMany({
          where: { documentId: id },
        }),
        this.prisma.document.update({
          where: { id },
          data: {
            ...updateData,
            items: {
              create: dto.table.map((row) => ({
                sum: Number(row.sum) || 0,
                count: Number(row.count) || 0,
              })),
            },
          },
        }),
      ]);
    } else {
      await this.prisma.document.update({
        where: { id },
        data: updateData,
      });
    }

    return this.findOne(id);
  }

  /**
   * Delete document by ID
   */
  async remove(id: string) {
    await this.findOne(id); // Ensure existence

    await this.prisma.document.delete({
      where: { id },
    });

    return { success: true, message: `Document #${id} deleted successfully` };
  }
}
