import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { extname } from 'path';
import { ItemService } from './item.service';
import { ItemMasterUploadService } from './item-master-upload.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { UpdateItemMinMaxDto } from './dto/update-item-minmax.dto';
import { CreateItemStocksForPrintDto } from './dto/create-item-stocks-for-print.dto';
import { CreateItemStocksForPrintByStockDto } from './dto/create-item-stocks-for-print-by-stock.dto';
import { DeleteItemStocksForPrintDto } from './dto/delete-item-stocks-for-print.dto';

const fileInterceptorOptions = {
  storage: diskStorage({
    destination: process.env.UPLOAD_PATH || './uploads/items',
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
      cb(new Error('Only image files are allowed!'), false);
      return;
    }
    cb(null, true);
  },
};

@Controller('items')
export class ItemController {
  constructor(
    private readonly itemService: ItemService,
    private readonly itemMasterUploadService: ItemMasterUploadService,
  ) { }

  @Post()
  async create(@Body() body: CreateItemDto) {
    return this.itemService.createItem(body);
  }

  /** อัปโหลดไฟล์ Excel เพื่อเพิ่ม/อัปเดต Item Master หลายรายการ (ซ้ำ = update, ไม่ซ้ำ = insert) */
  @Post('items-master-upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!/\.(xlsx|xls)$/i.test(file.originalname)) {
          cb(new BadRequestException('รองรับเฉพาะไฟล์ Excel (.xlsx, .xls)'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadItemMaster(@UploadedFile() file: { buffer?: Buffer } | undefined) {
    try {
      if (!file?.buffer) {
        return { success: false, error: 'ไม่พบไฟล์ที่อัปโหลด' };
      }
      const result = await this.itemMasterUploadService.parseAndCreate(file.buffer);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('picture', fileInterceptorOptions))
  async createWithFile(
    @UploadedFile() file: any,
    @Body() body: any,
  ) {
    if (file) {
      body.Picture = `uploads/items/${file.filename}`;
    }
    return this.itemService.createItem(body);
  }

  @Get('stats')
  async getStats(
    @Query('cabinet_id') cabinet_id?: string,
    @Query('department_id') department_id?: string,
  ) {
    const cabinetId = cabinet_id ? parseInt(cabinet_id, 10) : undefined;
    const departmentId = department_id ? parseInt(department_id, 10) : undefined;
    return this.itemService.getItemsStats(cabinetId, departmentId);
  }

  @Get('by-user/:user_id')
  async findByUser(@Param('user_id', ParseIntPipe) user_id: number) {
    return this.itemService.findItemsByUser(user_id);
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('keyword') keyword?: string,
    @Query('sort_by') sort_by?: string,
    @Query('sort_order') sort_order?: string,
    @Query('cabinet_id') cabinet_id?: string,
    @Query('department_id') department_id?: string,
    @Query('status') status?: string,
    @Query('stock_status') stock_status?: string,
    @Query('expire_from') expire_from?: string,
    @Query('expire_to') expire_to?: string,
  ) {
    const cabinetId = cabinet_id ? parseInt(cabinet_id, 10) : undefined;
    const departmentId = department_id ? parseInt(department_id, 10) : undefined;
    return this.itemService.findAllItems(
      page,
      limit,
      keyword,
      sort_by || 'itemcode',
      sort_order || 'asc',
      cabinetId,
      departmentId,
      status,
      undefined,
      stock_status,
      expire_from,
      expire_to,
    );
  }

  /** รายการ master จากตาราง Item (ทุกรายการ รวมที่ยังไม่มีสต็อกในตู้) — สำหรับหน้าจัดการ Item */
  @Get('master')
  async findAllMaster(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('keyword') keyword?: string,
    @Query('sort_by') sort_by?: string,
    @Query('sort_order') sort_order?: string,
    @Query('item_status_filter') item_status_filter?: string,
  ) {
    return this.itemService.findAllItemsMaster(
      page,
      limit,
      keyword,
      sort_by || 'itemcode',
      sort_order || 'asc',
      item_status_filter,
    );
  }

  /** รายการจาก slot ในตู้ (+ จำนวนในตู้ / max / ต้องเติม) — ใช้เลือกพิมพ์สติ๊กเกอร์์ */
  @Get('cabinet-slot-items')
  async findCabinetSlotItems(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('cabinet_id') cabinet_id?: string,
    @Query('department_id') department_id?: string,
    @Query('keyword') keyword?: string,
  ) {
    const cabId =
      cabinet_id != null && cabinet_id !== ''
        ? parseInt(cabinet_id, 10)
        : NaN;
    if (!Number.isFinite(cabId) || cabId < 1) {
      return {
        success: false,
        message: 'cabinet_id จำเป็นและต้องเป็นตัวเลข',
        data: [],
        total: 0,
        page,
        limit,
        lastPage: 0,
      };
    }
    const deptRaw =
      department_id != null && department_id !== ''
        ? parseInt(department_id, 10)
        : undefined;
    const deptId =
      deptRaw != null && Number.isFinite(deptRaw) && deptRaw > 0
        ? deptRaw
        : undefined;
    return this.itemService.findCabinetSlotItemsForPrint(
      page,
      limit,
      cabId,
      deptId,
      keyword,
    );
  }

  @Get(':itemcode/departments')
  async findItemDepartments(@Param('itemcode') itemcode: string) {
    return this.itemService.getItemDepartments(itemcode);
  }

  @Get(':itemcode')
  async findOne(@Param('itemcode') itemcode: string) {
    return this.itemService.findOneItem(itemcode);
  }

  @Put(':itemcode')
  @UseInterceptors(FileInterceptor('picture', fileInterceptorOptions))
  async update(
    @Param('itemcode') itemcode: string,
    @UploadedFile() file: any,
    @Body() body: any,
  ) {
    const cleanBody: any = {};
    Object.keys(body || {}).forEach((key) => {
      const cleanKey = key.replace(/\t/g, '').trim();
      cleanBody[cleanKey] = body[key];
    });
    const updateItemDto: UpdateItemDto = {
      itemname: cleanBody.itemname,
      Barcode: cleanBody.Barcode,
      CostPrice: cleanBody.CostPrice ? parseFloat(cleanBody.CostPrice) : undefined,
      SalePrice: cleanBody.SalePrice ? parseFloat(cleanBody.SalePrice) : undefined,
      stock_balance: cleanBody.stock_balance ? parseInt(cleanBody.stock_balance, 10) : undefined,
      DepartmentID:
        cleanBody.DepartmentID !== undefined && cleanBody.DepartmentID !== null && String(cleanBody.DepartmentID).trim() !== ''
          ? parseInt(String(cleanBody.DepartmentID), 10)
          : undefined,
      item_status: cleanBody.item_status !== undefined ? parseInt(cleanBody.item_status, 10) : undefined,
      IsCancel: cleanBody.IsCancel !== undefined ? parseInt(String(cleanBody.IsCancel), 10) : undefined,
    };

    if (cleanBody.department_ids !== undefined) {
      const raw = cleanBody.department_ids;
      const arr = Array.isArray(raw)
        ? raw
        : typeof raw === 'string' && raw.trim() !== ''
          ? raw.split(',')
          : [];
      updateItemDto.department_ids = arr
        .map((v: any) => parseInt(String(v), 10))
        .filter((n: number) => !Number.isNaN(n));
    }
    if (cleanBody.UnitID !== undefined && cleanBody.UnitID !== null && String(cleanBody.UnitID).trim() !== '') {
      const uid = parseInt(String(cleanBody.UnitID), 10);
      if (!Number.isNaN(uid)) {
        updateItemDto.UnitID = uid;
      }
    }

    const rawSubId = cleanBody.SubUnitID ?? cleanBody.sub_unit_id;
    if (rawSubId !== undefined && rawSubId !== null && String(rawSubId).trim() !== '') {
      const sid = parseInt(String(rawSubId), 10);
      if (!Number.isNaN(sid) && sid > 0) {
        updateItemDto.SubUnitID = sid;
      }
    } else if (rawSubId === '' || rawSubId === null) {
      updateItemDto.SubUnitID = null;
    }

    const rawSubQty = cleanBody.SubUnitQty ?? cleanBody.sub_unit_qty;
    if (rawSubQty !== undefined && rawSubQty !== null && String(rawSubQty).trim() !== '') {
      const q = parseInt(String(rawSubQty), 10);
      if (!Number.isNaN(q) && q >= 1) {
        updateItemDto.SubUnitQty = q;
      }
    } else if (rawSubQty === '' || rawSubQty === null) {
      updateItemDto.SubUnitQty = null;
    }

    if (file) {
      updateItemDto.Picture = `uploads/items/${file.filename}`;
    }
    return this.itemService.updateItem(itemcode, updateItemDto);
  }

  @Patch(':itemcode/minmax')
  async updateMinMax(
    @Param('itemcode') itemcode: string,
    @Body() updateMinMaxDto: UpdateItemMinMaxDto,
  ) {
    return this.itemService.updateItemMinMax(itemcode, updateMinMaxDto);
  }

  @Delete(':itemcode')
  async remove(@Param('itemcode') itemcode: string) {
    return this.itemService.removeItem(itemcode);
  }
}

@Controller('item-stocks')
export class ItemStockController {
  constructor(private readonly itemService: ItemService) { }

  /** สร้าง itemstock + RFID เฮกซ์ 24 ตัว (สุ่ม) ตามจำนวนแผ่น — ใช้ก่อนพิมพ์สติ๊กเกอร์ */
  @Post('for-print')
  async createForPrint(@Body() body: CreateItemStocksForPrintDto) {
    return this.itemService.createItemStocksForPrint(body.lines);
  }

  /** สร้าง itemstock จาก stock_id โดย map cabinet/department อัตโนมัติ (ไม่ต้องเลือก Division/ตู้) */
  @Post('for-print-by-stock')
  async createForPrintByStock(@Body() body: CreateItemStocksForPrintByStockDto) {
    return this.itemService.createItemStocksForPrintByStock(body.lines, body.department_id);
  }

  /** ลบ itemstock ที่สร้างเพื่อเตรียมพิมพ์ (เลือกหลายแถวได้) */
  @Post('for-print/delete')
  async deleteForPrint(@Body() body: DeleteItemStocksForPrintDto) {
    return this.itemService.deleteItemStocksForPrint(body.rowIds);
  }

  /** รายการยืมจาก itemslotincabinet_detail (IsBorrow) + ตู้จาก StockID + Division จาก cabinet→department */
  @Get('borrow')
  async findBorrow(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('keyword') keyword?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('department_id') department_id?: string,
    @Query('cabinet_id') cabinet_id?: string,
    @Query('borrow_department_id') borrow_department_id?: string,
  ) {
    const departmentId =
      department_id != null && department_id !== '' ? parseInt(department_id, 10) : undefined;
    const cabinetId =
      cabinet_id != null && cabinet_id !== '' ? parseInt(cabinet_id, 10) : undefined;
    const borrowDepartmentId =
      borrow_department_id != null && borrow_department_id !== ''
        ? parseInt(borrow_department_id, 10)
        : undefined;
    return this.itemService.findBorrowItemStocks({
      page,
      limit,
      keyword,
      startDate: start_date,
      endDate: end_date,
      departmentId: Number.isNaN(departmentId) ? undefined : departmentId,
      cabinetId: Number.isNaN(cabinetId) ? undefined : cabinetId,
      borrowDepartmentId: Number.isNaN(borrowDepartmentId) ? undefined : borrowDepartmentId,
    });
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('keyword') keyword?: string,
    @Query('sort_by') sort_by?: string,
    @Query('sort_order') sort_order?: string,
  ) {
    return this.itemService.findAllItemStock(
      page,
      limit,
      keyword,
      sort_by || 'ItemCode',
      sort_order || 'asc',
    );
  }

  @Get('in-cabinet')
  async findAllInCabinet(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('keyword') keyword?: string,
    @Query('cabinet_id') cabinet_id?: string,
  ) {
    const cabinetId = cabinet_id ? parseInt(cabinet_id, 10) : undefined;
    return this.itemService.findAllItemStockInCabinet(page, limit, keyword, cabinetId);
  }

  @Get('will-return')
  async findAllWillReturn(
    @Query('department_id') department_id?: string,
    @Query('cabinet_id') cabinet_id?: string,
    @Query('sub_department_id') sub_department_id?: string,
    @Query('item_code') item_code?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
  ) {
    const filters: {
      department_id?: number;
      cabinet_id?: number;
      sub_department_id?: number;
      item_code?: string;
      start_date?: string;
      end_date?: string;
    } = {};
    if (department_id != null && department_id !== '') {
      const n = parseInt(department_id, 10);
      if (!Number.isNaN(n)) filters.department_id = n;
    }
    if (cabinet_id != null && cabinet_id !== '') {
      const n = parseInt(cabinet_id, 10);
      if (!Number.isNaN(n)) filters.cabinet_id = n;
    }
    if (sub_department_id != null && sub_department_id !== '') {
      const n = parseInt(sub_department_id, 10);
      if (!Number.isNaN(n) && n >= 1) filters.sub_department_id = n;
    }
    if (item_code != null && item_code.trim() !== '') filters.item_code = item_code.trim();
    if (start_date != null && start_date.trim() !== '') filters.start_date = start_date.trim();
    if (end_date != null && end_date.trim() !== '') filters.end_date = end_date.trim();
    return this.itemService.findAllItemStockWillReturn(
      Object.keys(filters).length > 0 ? filters : undefined,
    );
  }
}
