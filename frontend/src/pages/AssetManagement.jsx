import { useCallback, useEffect, useState } from "react";
import {Package,Search,RefreshCw,AlertCircle,MapPin,Hash,Monitor,Boxes,Users,Wrench,Archive,AlertTriangle,Layers,
    Plus,X,Save,Eye,Pencil,UserPlus,RotateCcw,History,Upload,
} from "lucide-react";

import api from "../api/client";
import AppSidebar from "../components/AppSidebar";

// URL ของ Backend สำหรับเรียกดูรูปภาพ
const API_ORIGIN = new URL(
    api.defaults.baseURL || window.location.origin,
    window.location.origin
).origin;

const STATUS_LABELS = {
    AVAILABLE: "พร้อมใช้งาน",
    ASSIGNED: "ถูกมอบหมาย",
    IN_USE: "กำลังใช้งาน",
    UNDER_REPAIR: "อยู่ระหว่างซ่อม",
    DISPOSED: "จำหน่ายแล้ว",
    INACTIVE: "ไม่ใช้งาน",
};

const STATUS_CLASSES = {
    AVAILABLE: "status-resolved",
    ASSIGNED: "status-assigned",
    IN_USE: "status-progress",
    UNDER_REPAIR: "status-waiting",
    DISPOSED: "status-closed",
    INACTIVE: "status-cancelled",
};

export default function AssetManagement({
    user,
    onLogout,
    onBackDashboard,
    onCreateTicket,
    onShowUsers,
    onShowSettings,
}) {
    const [assets, setAssets] = useState([]);
    const [categories, setCategories] = useState([]);

    const [summary, setSummary] = useState({
        total_assets: 0,
        individual_assets: 0,
        quantity_items: 0,
        assigned_assets: 0,
        under_repair: 0,
        disposed_assets: 0,
        low_stock_items: 0,
        total_stock_quantity: 0,
    });

    const [summaryLoading, setSummaryLoading] = useState(true);
    const [summaryError, setSummaryError] = useState("");

    const [keyword, setKeyword] = useState("");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [trackingType, setTrackingType] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [createError, setCreateError] = useState("");
    const [createSuccess, setCreateSuccess] = useState("");

    const initialAssetForm = {
        asset_name: "",
        category_id: "",
        brand: "",
        model: "",
        serial_number: "",
        description: "",
        location: "",
        quantity_on_hand: "0",
        minimum_quantity: "0",
        purchase_date: "",
        purchase_price: "",
        warranty_expiry: "",
    };
    const [assetForm, setAssetForm] = useState(initialAssetForm);

    // Create Asset Image
    const [createImageFile, setCreateImageFile] = useState(null);
    const [createImagePreview, setCreateImagePreview] = useState("");

    // Asset Detail
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");

    // Asset Image Upload
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const [imageUploading, setImageUploading] = useState(false);
    const [imageUploadError, setImageUploadError] = useState("");
    const [imageUploadSuccess, setImageUploadSuccess] = useState("");

    // คืนหน่วยความจำ Preview เมื่อเปลี่ยนรูปหรือปิด Component
    useEffect(() => {
        if (!imagePreview) return;

        return () => {
            URL.revokeObjectURL(imagePreview);
        };
    }, [imagePreview]);

    useEffect(() => {
        if (!createImagePreview) return;

        return () => {
            URL.revokeObjectURL(createImagePreview);
        };
    }, [createImagePreview]);

    // Asset Edit
    const [showEditForm, setShowEditForm] = useState(false);
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState("");
    const [editSuccess, setEditSuccess] = useState("");

    const [editForm, setEditForm] = useState({
        asset_name: "",
        category_id: "",
        brand: "",
        model: "",
        serial_number: "",
        description: "",
        location: "",
        minimum_quantity: "0",
        purchase_date: "",
        purchase_price: "",
        warranty_expiry: "",
    });

    // Asset Assignment
    const [assignableUsers, setAssignableUsers] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [assignmentLoading, setAssignmentLoading] = useState(false);

    const [assignedTo, setAssignedTo] = useState("");
    const [assignUserSearch, setAssignUserSearch] = useState("");
    const [showUserOptions, setShowUserOptions] = useState(false);
    const [assignmentNote, setAssignmentNote] = useState("");
    const [returnNote, setReturnNote] = useState("");

    const [assignmentSaving, setAssignmentSaving] = useState(false);
    const [assignmentError, setAssignmentError] = useState("");
    const [assignmentSuccess, setAssignmentSuccess] = useState("");

    // Quantity Stock Transaction
    const [stockTransactions, setStockTransactions] = useState([]);
    const [stockLoading, setStockLoading] = useState(false);
    const [stockSaving, setStockSaving] = useState(false);
    const [stockError, setStockError] = useState("");
    const [stockSuccess, setStockSuccess] = useState("");
    const [stockType, setStockType] = useState("ISSUE");
    const [stockQuantity, setStockQuantity] = useState("1");
    const [stockRecipient, setStockRecipient] = useState("");
    const [stockReference, setStockReference] = useState("");
    const [stockNote, setStockNote] = useState("");

    // ดักจับปุ่ม ESC เพื่อปิด Modal ทั้งหมดตามลำดับความสำคัญ
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                if (showEditForm && !editSaving) {
                    handleCloseEdit();
                } else if (showDetail && !editSaving && !imageUploading) {
                    handleCloseDetail();
                } else if (showCreateForm && !saving) {
                    handleCloseCreateForm();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [showCreateForm, showDetail, showEditForm, saving, editSaving, imageUploading]);

    const loadAssets = useCallback(async () => {
        try {
            setError("");

            const response = await api.get("/assets", {
                params: {
                    keyword: searchKeyword || undefined,
                    tracking_type: trackingType || undefined,
                    status_filter: statusFilter || undefined,
                },
            });

            setAssets(Array.isArray(response.data) ? response.data : []);
            setCurrentPage(1);
        } catch (err) {
            setError(
                err.response?.data?.detail ||
                "ไม่สามารถโหลดรายการ IT Asset ได้"
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [searchKeyword, trackingType, statusFilter]);

    const loadCategories = useCallback(async () => {
        try {
            const response = await api.get("/assets/categories");
            setCategories(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error("Load asset categories failed:", err);
        }
    }, []);

    const loadSummary = useCallback(async () => {
        try {
            setSummaryError("");

            const response = await api.get(
                "/assets/dashboard/summary"
            );

            setSummary({
                total_assets: response.data.total_assets ?? 0,
                individual_assets: response.data.individual_assets ?? 0,
                quantity_items: response.data.quantity_items ?? 0,
                assigned_assets: response.data.assigned_assets ?? 0,
                under_repair: response.data.under_repair ?? 0,
                disposed_assets: response.data.disposed_assets ?? 0,
                low_stock_items: response.data.low_stock_items ?? 0,
                total_stock_quantity: response.data.total_stock_quantity ?? 0,
            });
        } catch (err) {
            setSummaryError(
                err.response?.data?.detail ||
                "ไม่สามารถโหลดข้อมูลสรุป IT Asset ได้"
            );
        } finally {
            setSummaryLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAssets();
    }, [loadAssets]);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    useEffect(() => {
        loadSummary();
    }, [loadSummary]);

    function handleSearch(event) {
        event.preventDefault();
        setSearchKeyword(keyword.trim());
    }

    function handleRefresh() {
        setRefreshing(true);

        loadAssets();
        loadSummary();
    }

    function handleReset() {
        setKeyword("");
        setSearchKeyword("");
        setTrackingType("");
        setStatusFilter("");
    }

    function handleOpenCreateForm() {
        setAssetForm(initialAssetForm);

        setCreateImageFile(null);
        setCreateImagePreview("");

        setCreateError("");
        setCreateSuccess("");
        setShowCreateForm(true);
    }

    function handleCloseCreateForm() {
        if (saving) return;

        setShowCreateForm(false);
        setCreateError("");
    }

    function handleAssetFormChange(event) {
        const { name, value } = event.target;

        setAssetForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    }
    
    function handleCreateImageChange(event) {
        const file = event.target.files?.[0];

        if (!file) return;

        setCreateError("");
        setCreateSuccess("");

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.type)) {
            setCreateError(
                "รองรับเฉพาะไฟล์ JPG, JPEG, PNG และ WEBP"
            );
            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setCreateError("ขนาดรูปภาพต้องไม่เกิน 5 MB");
            event.target.value = "";
            return;
        }

        setCreateImageFile(file);
        setCreateImagePreview(URL.createObjectURL(file));

        event.target.value = "";
    }

    async function handleCreateAsset(event) {
        event.preventDefault();

        setCreateError("");
        setCreateSuccess("");

        if (!assetForm.asset_name.trim()) {
            setCreateError("กรุณากรอกชื่ออุปกรณ์");
            return;
        }

        if (!assetForm.category_id) {
            setCreateError("กรุณาเลือกหมวดหมู่ทรัพย์สิน");
            return;
        }

        const selectedCategory = categories.find(
            (category) =>
                String(category.id) === String(assetForm.category_id)
        );

        if (!selectedCategory) {
            setCreateError("ไม่พบหมวดหมู่ที่เลือก กรุณาเลือกใหม่");
            return;
        }

        const isQuantity =
            selectedCategory.tracking_type === "QUANTITY";

        const payload = {
            asset_name: assetForm.asset_name.trim(),
            category_id: Number(assetForm.category_id),
            brand: assetForm.brand.trim() || null,
            model: assetForm.model.trim() || null,
            serial_number: isQuantity
                ? null
                : assetForm.serial_number.trim() || null,
            description: assetForm.description.trim() || null,
            location: assetForm.location.trim() || null,

            quantity_on_hand: isQuantity
                ? Number(assetForm.quantity_on_hand || 0)
                : 0,

            minimum_quantity: isQuantity
                ? Number(assetForm.minimum_quantity || 0)
                : 0,

            purchase_date: assetForm.purchase_date || null,
            purchase_price:
                assetForm.purchase_price !== ""
                    ? Number(assetForm.purchase_price)
                    : null,
            warranty_expiry: assetForm.warranty_expiry || null,
        };

        if (
            isQuantity &&
            (payload.quantity_on_hand < 0 ||
                payload.minimum_quantity < 0)
        ) {
            setCreateError("จำนวนทรัพย์สินต้องไม่ติดลบ");
            return;
        }

        if (
            payload.purchase_price !== null &&
            payload.purchase_price < 0
        ) {
            setCreateError("ราคาซื้อต้องไม่ติดลบ");
            return;
        }

        try {
            setSaving(true);

            // 1. สร้าง Asset ก่อน
            const response = await api.post("/assets", payload);
            const createdAsset = response.data;

            let successMessage = "ลงทะเบียนทรัพย์สินสำเร็จ";

            // 2. ถ้ามีรูปภาพ ให้อัปโหลดผูกกับ Asset ที่เพิ่งสร้าง
            if (createImageFile) {
                if (createdAsset?.id) {
                    try {
                        const formData = new FormData();
                        formData.append("file", createImageFile);

                        await api.post(
                            `/assets/${createdAsset.id}/image`,
                            formData
                        );

                        successMessage =
                            "ลงทะเบียนทรัพย์สินและ Upload รูปภาพสำเร็จ";
                    } catch (uploadErr) {
                        const uploadDetail =
                            uploadErr.response?.data?.detail ||
                            "ไม่สามารถ Upload รูปภาพได้";

                        successMessage =
                            `ลงทะเบียนทรัพย์สินสำเร็จ แต่ Upload รูปภาพไม่สำเร็จ: ${uploadDetail}`;
                    }
                } else {
                    successMessage =
                        "ลงทะเบียนทรัพย์สินสำเร็จ แต่ไม่พบ Asset ID สำหรับ Upload รูปภาพ";
                }
            }

            setCreateSuccess(successMessage);
            setCreateError("");

            // 3. ปิดฟอร์มและล้างข้อมูล
            setShowCreateForm(false);
            setAssetForm(initialAssetForm);
            setCreateImageFile(null);
            setCreateImagePreview("");

            // 4. โหลดข้อมูลใหม่
            await Promise.all([
                loadAssets(),
                loadSummary(),
            ]);

        } catch (err) {
            const detail = err.response?.data?.detail;

            setCreateError(
                typeof detail === "string"
                    ? detail
                    : Array.isArray(detail)
                        ? detail.map((item) => item.msg).join(", ")
                        : "ไม่สามารถบันทึกทรัพย์สินได้ กรุณาตรวจสอบข้อมูล"
            );
        } finally {
            setSaving(false);
        }
    }

    // เปิดดูรายละเอียด Asset
    async function handleViewAsset(assetId) {
        setShowDetail(true);
        setShowEditForm(false);
        setSelectedAsset(null);
        setDetailError("");
        setImageFile(null);
        setImagePreview("");
        setImageUploadError("");
        setImageUploadSuccess("");
        setDetailLoading(true);

        setAssignments([]);
        setAssignableUsers([]);
        setAssignmentError("");
        setAssignmentSuccess("");
        setAssignmentNote("");
        setReturnNote("");
        setAssignedTo("");

        try {
            const response = await api.get(`/assets/${assetId}`);
            setSelectedAsset(response.data);

            if (response.data.tracking_type === "INDIVIDUAL") {
                await loadAssignmentData(assetId);
            } else if (response.data.tracking_type === "QUANTITY") {
                setStockTransactions([]);
                setStockError("");
                setStockSuccess("");
                setStockType("ISSUE");
                setStockQuantity("1");
                setStockRecipient("");
                setStockReference("");
                setStockNote("");
                await loadStockData(assetId);
            }
        } catch (err) {
            setDetailError(
                err.response?.data?.detail ||
                "ไม่สามารถโหลดรายละเอียดทรัพย์สินได้"
            );
        } finally {
            setDetailLoading(false);
        }
    }

    // เลือกรูปภาพ Asset
    function handleSelectAssetImage(event) {
        const file = event.target.files?.[0];

        if (!file) return;

        setImageUploadError("");
        setImageUploadSuccess("");

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.type)) {
            setImageUploadError(
                "รองรับเฉพาะไฟล์ JPG, JPEG, PNG และ WEBP"
            );
            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setImageUploadError("ขนาดรูปภาพต้องไม่เกิน 5 MB");
            event.target.value = "";
            return;
        }

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));

        // อนุญาตให้เลือกไฟล์เดิมซ้ำได้
        event.target.value = "";
    }


    // Upload รูปภาพ Asset
    async function handleUploadAssetImage() {
        if (!selectedAsset || !imageFile) {
            setImageUploadError("กรุณาเลือกรูปภาพก่อน");
            return;
        }

        try {
            setImageUploading(true);
            setImageUploadError("");
            setImageUploadSuccess("");

            const formData = new FormData();
            formData.append("file", imageFile);

            // เรียก API Upload รูปภาพ
            await api.post(
                `/assets/${selectedAsset.id}/image`,
                formData
            );

            // โหลดรายละเอียด Asset ใหม่ เพื่อรับ image_path ล่าสุด
            const response = await api.get(
                `/assets/${selectedAsset.id}`
            );

            setSelectedAsset(response.data);

            setImageFile(null);
            setImagePreview("");

            setImageUploadSuccess("อัปโหลดรูปภาพสำเร็จ");

            // Refresh รายการ Asset
            await loadAssets();

        } catch (err) {
            setImageUploadError(
                err.response?.data?.detail ||
                "ไม่สามารถอัปโหลดรูปภาพได้"
            );
        } finally {
            setImageUploading(false);
        }
    }

    // โหลดข้อมูลการเบิก-คืนทรัพย์สิน
    async function loadAssignmentData(assetId) {
        try {
            setAssignmentLoading(true);
            setAssignmentError("");

            const [usersResponse, historyResponse] = await Promise.all([
                api.get("/assets/assignable-users"),
                api.get(`/assets/${assetId}/assignments`),
            ]);

            setAssignableUsers(
                Array.isArray(usersResponse.data)
                    ? usersResponse.data
                    : []
            );

            setAssignments(
                Array.isArray(historyResponse.data)
                    ? historyResponse.data
                    : []
            );
        } catch (err) {
            setAssignmentError(
                err.response?.data?.detail ||
                "ไม่สามารถโหลดข้อมูลการเบิก-คืนทรัพย์สินได้"
            );
        } finally {
            setAssignmentLoading(false);
        }
    }

    async function loadStockData(assetId) {
        try {
            setStockLoading(true);
            setStockError("");

            const [usersResponse, historyResponse] = await Promise.all([
                api.get("/assets/assignable-users"),
                api.get(`/assets/${assetId}/stock-transactions`),
            ]);

            setAssignableUsers(
                Array.isArray(usersResponse.data) ? usersResponse.data : []
            );
            setStockTransactions(
                Array.isArray(historyResponse.data) ? historyResponse.data : []
            );
        } catch (err) {
            setStockError(
                err.response?.data?.detail ||
                "ไม่สามารถโหลดประวัติ Stock Transaction ได้"
            );
        } finally {
            setStockLoading(false);
        }
    }

    async function handleStockTransaction(event) {
        event.preventDefault();
        if (!selectedAsset) return;

        const quantity = Number(stockQuantity);
        if (!Number.isInteger(quantity) || quantity <= 0) {
            setStockError("กรุณาระบุจำนวนเป็นจำนวนเต็มมากกว่า 0");
            return;
        }
        if (stockType === "ISSUE" && !stockRecipient) {
            setStockError("กรุณาเลือกผู้รับอุปกรณ์");
            return;
        }

        try {
            setStockSaving(true);
            setStockError("");
            setStockSuccess("");

            const payload = {
                transaction_type: stockType,
                quantity,
                issued_to: stockType === "ISSUE" ? Number(stockRecipient) : null,
                reference_no: stockReference.trim() || null,
                note: stockNote.trim() || null,
            };

            const response = await api.post(
                `/assets/${selectedAsset.id}/stock-transactions`,
                payload
            );

            setStockSuccess(
                `${stockType === "RECEIVE" ? "รับสินค้าเข้า" : "เบิกสินค้า"}สำเร็จ Stock คงเหลือ ${response.data.quantity_on_hand} ชิ้น`
            );
            setStockQuantity("1");
            setStockRecipient("");
            setStockReference("");
            setStockNote("");

            const [assetResponse] = await Promise.all([
                api.get(`/assets/${selectedAsset.id}`),
                loadStockData(selectedAsset.id),
                loadAssets(),
                loadSummary(),
            ]);
            setSelectedAsset(assetResponse.data);
        } catch (err) {
            const detail = err.response?.data?.detail;
            setStockError(
                typeof detail === "string"
                    ? detail
                    : Array.isArray(detail)
                        ? detail.map((item) => item.msg).join(", ")
                        : "ไม่สามารถบันทึกรายการ Stock ได้"
            );
        } finally {
            setStockSaving(false);
        }
    }

    // โหลดข้อมูล Asset ใหม่หลังทำรายการ
    async function refreshSelectedAsset(assetId) {
        const response = await api.get(`/assets/${assetId}`);
        setSelectedAsset(response.data);

        await Promise.all([
            loadAssignmentData(assetId),
            loadAssets(),
            loadSummary(),
        ]);
    }

    async function handleAssignAsset(event) {
        event.preventDefault();

        if (!selectedAsset || !assignedTo) {
            setAssignmentError("กรุณาเลือกผู้รับทรัพย์สิน");
            return;
        }

        try {
            setAssignmentSaving(true);
            setAssignmentError("");
            setAssignmentSuccess("");

            await api.post(
                `/assets/${selectedAsset.id}/assign`,
                {
                    assigned_to: Number(assignedTo),
                    note: assignmentNote.trim() || null,
                }
            );

            await refreshSelectedAsset(selectedAsset.id);

            setAssignedTo("");
            setAssignUserSearch("");
            setShowUserOptions(false);
            setAssignmentNote("");
            setAssignmentSuccess("เบิกจ่ายทรัพย์สินสำเร็จ");
        } catch (err) {
            setAssignmentError(
                err.response?.data?.detail ||
                "ไม่สามารถเบิกจ่ายทรัพย์สินได้"
            );
        } finally {
            setAssignmentSaving(false);
        }
    }

    async function handleReturnAsset(event) {
        event.preventDefault();

        if (!selectedAsset) return;

        const confirmed = window.confirm(
            "ยืนยันการรับคืนทรัพย์สินรายการนี้หรือไม่?"
        );

        if (!confirmed) return;

        try {
            setAssignmentSaving(true);
            setAssignmentError("");
            setAssignmentSuccess("");

            await api.post(
                `/assets/${selectedAsset.id}/return`,
                {
                    note: returnNote.trim() || null,
                }
            );

            await refreshSelectedAsset(selectedAsset.id);

            setReturnNote("");
            setAssignmentSuccess("รับคืนทรัพย์สินสำเร็จ");
        } catch (err) {
            setAssignmentError(
                err.response?.data?.detail ||
                "ไม่สามารถรับคืนทรัพย์สินได้"
            );
        } finally {
            setAssignmentSaving(false);
        }
    }

    // ปิดหน้ารายละเอียด
    function handleCloseDetail() {
        if (editSaving || imageUploading) return;

        setShowDetail(false);
        setSelectedAsset(null);
        setDetailError("");

        setImageFile(null);
        setImagePreview("");
        setImageUploadError("");
        setImageUploadSuccess("");
    }

    // เปิดฟอร์มแก้ไข
    function handleOpenEdit() {
        if (!selectedAsset) return;

        setEditError("");
        setEditSuccess("");

        setEditForm({
            asset_name: selectedAsset.asset_name || "",
            category_id: String(selectedAsset.category_id),
            brand: selectedAsset.brand || "",
            model: selectedAsset.model || "",
            serial_number: selectedAsset.serial_number || "",
            description: selectedAsset.description || "",
            location: selectedAsset.location || "",
            minimum_quantity: String(
                selectedAsset.minimum_quantity ?? 0
            ),
            purchase_date: selectedAsset.purchase_date || "",
            purchase_price:
                selectedAsset.purchase_price != null
                    ? String(selectedAsset.purchase_price)
                    : "",
            warranty_expiry: selectedAsset.warranty_expiry || "",
        });

        setShowEditForm(true);
    }

    // ปิดฟอร์มแก้ไข
    function handleCloseEdit() {
        if (editSaving) return;

        setShowEditForm(false);
        setEditError("");
    }

    // เปลี่ยนค่าฟอร์มแก้ไข
    function handleEditFormChange(event) {
        const { name, value } = event.target;

        setEditForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    // บันทึกการแก้ไข Asset
    async function handleUpdateAsset(event) {
        event.preventDefault();

        if (!selectedAsset) return;

        setEditError("");
        setEditSuccess("");

        if (editForm.asset_name.trim().length < 2) {
            setEditError("ชื่ออุปกรณ์ต้องมีอย่างน้อย 2 ตัวอักษร");
            return;
        }

        const selectedCategory = categories.find(
            (category) =>
                String(category.id) === String(editForm.category_id)
        );

        if (
            String(editForm.category_id) !==
            String(selectedAsset.category_id)
        ) {
            if (!selectedCategory) {
                setEditError("กรุณาเลือกหมวดหมู่ที่ถูกต้อง");
                return;
            }

            if (
                selectedCategory.tracking_type !==
                selectedAsset.tracking_type
            ) {
                setEditError(
                    "ไม่สามารถเปลี่ยนประเภทการจัดการทรัพย์สินได้"
                );
                return;
            }
        }

        const purchasePrice =
            editForm.purchase_price.trim() === ""
                ? null
                : Number(editForm.purchase_price);

        const minimumQuantity = Number(
            editForm.minimum_quantity || 0
        );

        if (
            purchasePrice !== null &&
            (!Number.isFinite(purchasePrice) || purchasePrice < 0)
        ) {
            setEditError("ราคาซื้อต้องเป็นตัวเลขและไม่ติดลบ");
            return;
        }

        if (
            selectedAsset.tracking_type === "QUANTITY" &&
            (!Number.isInteger(minimumQuantity) || minimumQuantity < 0)
        ) {
            setEditError("จำนวนขั้นต่ำต้องเป็นจำนวนเต็มและไม่ติดลบ");
            return;
        }

        // ส่งเฉพาะฟิลด์ที่ AssetUpdate อนุญาต
        const payload = {
            asset_name: editForm.asset_name.trim(),
            brand: editForm.brand.trim() || null,
            model: editForm.model.trim() || null,
            serial_number:
                selectedAsset.tracking_type === "QUANTITY"
                    ? null
                    : editForm.serial_number.trim() || null,
            description: editForm.description.trim() || null,
            location: editForm.location.trim() || null,
            purchase_date: editForm.purchase_date || null,
            purchase_price: purchasePrice,
            warranty_expiry: editForm.warranty_expiry || null,
        };

        // เปลี่ยนหมวดหมู่เฉพาะเมื่อผู้ใช้เลือกหมวดหมู่ใหม่
        if (
            String(editForm.category_id) !==
            String(selectedAsset.category_id)
        ) {
            payload.category_id = Number(editForm.category_id);
        }

        // จำนวนขั้นต่ำใช้เฉพาะทรัพย์สินแบบ QUANTITY
        if (selectedAsset.tracking_type === "QUANTITY") {
            payload.minimum_quantity = minimumQuantity;
        }

        try {
            setEditSaving(true);

            const response = await api.put(
                `/assets/${selectedAsset.id}`,
                payload
            );

            setSelectedAsset(response.data);
            setEditSuccess("แก้ไขข้อมูลทรัพย์สินสำเร็จ");
            setShowEditForm(false);

            await Promise.all([
                loadAssets(),
                loadSummary(),
            ]);
        } catch (err) {
            const detail = err.response?.data?.detail;

            setEditError(
                typeof detail === "string"
                    ? detail
                    : Array.isArray(detail)
                        ? detail.map((item) => item.msg).join(", ")
                        : "ไม่สามารถแก้ไขข้อมูลทรัพย์สินได้"
            );
        } finally {
            setEditSaving(false);
        }
    }

    const categoryMap = Object.fromEntries(
        categories.map((category) => [
            category.id,
            category.category_name,
        ])
    );

    const userMap = Object.fromEntries(
        assignableUsers.map((item) => [
            item.id,
            item.full_name || item.username,
        ])
    );

    const activeAssignment = assignments.find(
        (item) => !item.returned_at
    );

    const filteredAssignableUsers = assignableUsers.filter((item) => {
        const search = assignUserSearch.toLowerCase().trim();

        return (
            (item.full_name || "").toLowerCase().includes(search) ||
            (item.username || "").toLowerCase().includes(search) ||
            (item.department || "").toLowerCase().includes(search)
        );
    });

    function handleSelectAssignableUser(item) {
        setAssignedTo(String(item.id));
        setAssignUserSearch(
            `${item.full_name} (${item.username})`
        );
        setShowUserOptions(false);
    }

    const totalPages = Math.max(
        1,
        Math.ceil(assets.length / pageSize)
    );

    const startIndex = (currentPage - 1) * pageSize;
    const paginatedAssets = assets.slice(
        startIndex,
        startIndex + pageSize
    );

    const formatSummary = (value) => {
        if (summaryLoading) return "...";

        return Number(value ?? 0).toLocaleString("th-TH");
    };

    return (
        <div className="dashboard-shell">
            <AppSidebar
                user={user}
                onLogout={onLogout}
                activeSection="assets"
                onBackDashboard={onBackDashboard}
                onShowAssets={() => { }}
                onCreateTicket={onCreateTicket}
                onShowUsers={onShowUsers}
                onShowSettings={onShowSettings}
            />

            <main className="dashboard-main">
                <header className="topbar">
                    <div className="breadcrumb">
                        Workspace <span>/</span> <b>IT Asset</b>
                    </div>

                    <div className="topbar-actions">
                        <span className="system-status">
                            <span /> ระบบพร้อมใช้งาน
                        </span>

                        <div className="topbar-avatar">
                            {(user?.full_name || "U")
                                .slice(0, 1)
                                .toUpperCase()}
                        </div>
                    </div>
                </header>

                <div className="dashboard-content">
                    <section className="welcome-row">
                        <div>
                            <span className="page-eyebrow">
                                IT MANAGEMENT
                            </span>
                            <h1>IT Asset</h1>
                            <p>
                                ระบบจัดการทรัพย์สินด้านเทคโนโลยีสารสนเทศ
                            </p>
                        </div>
                    </section>

                    {(createSuccess  || editSuccess) && (
                        <div className="success-banner">
                            <Package size={17} />
                            {editSuccess || createSuccess}
                        </div>
                    )}

                    {/* IT Asset Dashboard Summary */}
                    <section className="stats-grid">

                        {/* Total Assets */}
                        <div className="stat-card stat-blue">
                            <div className="stat-top">
                                <span>ทรัพย์สินทั้งหมด</span>
                                <div className="stat-icon">
                                    <Package size={18} />
                                </div>
                            </div>
                            <div className="stat-value">
                                {formatSummary(summary.total_assets)}
                            </div>
                            <div className="stat-hint">
                                <span className="hint-dot" />
                                จำนวนรายการทรัพย์สินในระบบ
                            </div>
                        </div>

                        {/* Individual Assets */}
                        <div className="stat-card stat-navy">
                            <div className="stat-top">
                                <span>ทรัพย์สินรายชิ้น</span>
                                <div className="stat-icon">
                                    <Monitor size={18} />
                                </div>
                            </div>
                            <div className="stat-value">
                                {formatSummary(summary.individual_assets)}
                            </div>
                            <div className="stat-hint">
                                <span className="hint-dot" />
                                Individual Assets
                            </div>
                        </div>

                        {/* Quantity Items */}
                        <div className="stat-card stat-green">
                            <div className="stat-top">
                                <span>รายการตามจำนวน</span>
                                <div className="stat-icon">
                                    <Boxes size={18} />
                                </div>
                            </div>
                            <div className="stat-value">
                                {formatSummary(summary.quantity_items)}
                            </div>
                            <div className="stat-hint">
                                <span className="hint-dot" />
                                Quantity Items
                            </div>
                        </div>

                        {/* Assigned Assets */}
                        <div className="stat-card stat-blue">
                            <div className="stat-top">
                                <span>ถูกมอบหมาย</span>
                                <div className="stat-icon">
                                    <Users size={18} />
                                </div>
                            </div>
                            <div className="stat-value">
                                {formatSummary(summary.assigned_assets)}
                            </div>
                            <div className="stat-hint">
                                <span className="hint-dot" />
                                Assigned Assets
                            </div>
                        </div>

                        {/* Under Repair */}
                        <div className="stat-card stat-red">
                            <div className="stat-top">
                                <span>อยู่ระหว่างซ่อม</span>
                                <div className="stat-icon">
                                    <Wrench size={18} />
                                </div>
                            </div>
                            <div className="stat-value">
                                {formatSummary(summary.under_repair)}
                            </div>
                            <div className="stat-hint">
                                <span className="hint-dot" />
                                Under Repair
                            </div>
                        </div>

                        {/* Disposed Assets */}
                        <div className="stat-card stat-navy">
                            <div className="stat-top">
                                <span>จำหน่ายแล้ว</span>
                                <div className="stat-icon">
                                    <Archive size={18} />
                                </div>
                            </div>
                            <div className="stat-value">
                                {formatSummary(summary.disposed_assets)}
                            </div>
                            <div className="stat-hint">
                                <span className="hint-dot" />
                                Disposed Assets
                            </div>
                        </div>

                        {/* Low Stock */}
                        <div className="stat-card stat-red">
                            <div className="stat-top">
                                <span>สินค้าใกล้หมด</span>
                                <div className="stat-icon">
                                    <AlertTriangle size={18} />
                                </div>
                            </div>
                            <div className="stat-value">
                                {formatSummary(summary.low_stock_items)}
                            </div>
                            <div className="stat-hint">
                                <span className="hint-dot" />
                                Low Stock Items
                            </div>
                        </div>

                        {/* Total Stock Quantity */}
                        <div className="stat-card stat-green">
                            <div className="stat-top">
                                <span>จำนวนคงเหลือรวม</span>
                                <div className="stat-icon">
                                    <Layers size={18} />
                                </div>
                            </div>
                            <div className="stat-value">
                                {formatSummary(summary.total_stock_quantity)}
                            </div>
                            <div className="stat-hint">
                                <span className="hint-dot" />
                                Total Stock Quantity
                            </div>
                        </div>

                    </section>

                    {summaryError && (
                        <div role="alert" className="error-banner">
                            <AlertCircle size={17} />
                            {summaryError}
                        </div>
                    )}

                    <section className="surface-card">
                        <div className="section-heading">
                            <div className="section-heading-icon">
                                <Package size={19} />
                            </div>

                            <div>
                                <h2>รายการทรัพย์สิน IT</h2>
                                <p>
                                    รายการอุปกรณ์และทรัพย์สินทั้งหมดในระบบ
                                </p>
                            </div>

                            <div className="table-heading-actions">
                                <span className="record-count">
                                    {assets.length} รายการ
                                </span>

                                <button
                                    type="button"
                                    className="primary-button"
                                    onClick={handleOpenCreateForm}
                                >
                                    <Plus size={16} />
                                    เพิ่มทรัพย์สิน
                                </button>

                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={handleRefresh}
                                    disabled={refreshing || loading}
                                >
                                    <RefreshCw
                                        size={15}
                                        className={refreshing ? "spin" : ""}
                                    />
                                    รีเฟรช
                                </button>
                            </div>
                        </div>

                        <form
                            onSubmit={handleSearch}
                            className="asset-filter-bar"
                        >
                            <div className="asset-search">
                                <Search size={17} />
                                <input
                                    type="text"
                                    value={keyword}
                                    onChange={(event) =>
                                        setKeyword(event.target.value)
                                    }
                                    placeholder="ค้นหา Asset Code, ชื่ออุปกรณ์ หรือ Serial Number"
                                />
                            </div>

                            <select
                                value={trackingType}
                                onChange={(event) =>
                                    setTrackingType(event.target.value)
                                }
                            >
                                <option value="">ทุกประเภท</option>
                                <option value="INDIVIDUAL">
                                    รายชิ้น (Individual)
                                </option>
                                <option value="QUANTITY">
                                    ตามจำนวน (Quantity)
                                </option>
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(event) =>
                                    setStatusFilter(event.target.value)
                                }
                            >
                                <option value="">ทุกสถานะ</option>
                                {Object.entries(STATUS_LABELS).map(
                                    ([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    )
                                )}
                            </select>

                            <button
                                type="submit"
                                className="primary-button"
                            >
                                <Search size={16} />
                                ค้นหา
                            </button>

                            <button
                                type="button"
                                className="secondary-button"
                                onClick={handleReset}
                            >
                                ล้างค่า
                            </button>
                        </form>

                        {error && (
                            <div role="alert" className="error-banner">
                                <AlertCircle size={17} />
                                {error}
                            </div>
                        )}

                        <div className="table-scroll">
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        <th>Asset Code</th>
                                        <th>ชื่ออุปกรณ์</th>
                                        <th>หมวดหมู่</th>
                                        <th>Serial Number</th>
                                        <th>สถานที่</th>
                                        <th>จำนวน</th>
                                        <th>สถานะ</th>
                                        <th>จัดการ</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7}>
                                                <div className="empty-state">
                                                    กำลังโหลดข้อมูล Asset...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        <>
                                            {paginatedAssets.map((asset) => {
                                                const status =
                                                    STATUS_LABELS[asset.status] ||
                                                    asset.status ||
                                                    "-";

                                                return (
                                                    <tr key={asset.id}>
                                                        <td>
                                                            <span className="ticket-number">
                                                                {asset.asset_code}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <span className="ticket-subject">
                                                                {asset.asset_name}
                                                            </span>
                                                            <small className="ticket-subtitle">
                                                                {[
                                                                    asset.brand,
                                                                    asset.model,
                                                                ]
                                                                    .filter(Boolean)
                                                                    .join(" ") || "-"}
                                                            </small>
                                                        </td>

                                                        <td>
                                                            {categoryMap[asset.category_id] ||
                                                                `Category #${asset.category_id}`}
                                                        </td>

                                                        <td>{asset.serial_number || "-"}</td>

                                                        <td>
                                                            <span className="date-cell">
                                                                <MapPin size={14} />
                                                                {asset.location || "-"}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            {asset.tracking_type === "QUANTITY"
                                                                ? asset.quantity_on_hand
                                                                : "-"}
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={`status-pill ${STATUS_CLASSES[asset.status] ||
                                                                    "status-closed"
                                                                    }`}
                                                            >
                                                                <span />
                                                                {status}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="secondary-button"
                                                                onClick={() => handleViewAsset(asset.id)}
                                                                title="ดูรายละเอียดทรัพย์สิน"
                                                            >
                                                                <Eye size={15} />
                                                                ดูรายละเอียด
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}

                                            {assets.length === 0 && !error && (
                                                <tr>
                                                    <td colSpan={8}>
                                                        <div className="empty-state">
                                                            <div className="empty-icon">
                                                                <Package size={27} />
                                                            </div>
                                                            <b>ยังไม่มีรายการ IT Asset</b>
                                                            <p>
                                                                เมื่อมีการลงทะเบียนอุปกรณ์
                                                                รายการจะแสดงที่นี่
                                                            </p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}

                                            {assets.length > 0 &&
                                                paginatedAssets.length === 0 && (
                                                    <tr>
                                                        <td colSpan={8}>
                                                            <div className="empty-state">
                                                                ไม่พบรายการในหน้านี้
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="table-footer">
                            <span>
                                แสดง{" "}
                                {assets.length === 0 ? 0 : startIndex + 1}
                                {" - "}
                                {Math.min(
                                    startIndex + pageSize,
                                    assets.length
                                )}
                                {" จาก "}
                                {assets.length} รายการ
                            </span>

                            <span>
                                <Hash size={14} />
                                IT Asset Management
                            </span>
                        </div>

                        {assets.length > pageSize && (
                            <div className="pagination">
                                <div className="pagination-controls">
                                    <button
                                        type="button"
                                        className="pagination-button"
                                        disabled={currentPage === 1}
                                        onClick={() =>
                                            setCurrentPage((page) =>
                                                Math.max(1, page - 1)
                                            )
                                        }
                                    >
                                        ‹
                                    </button>

                                    <span className="pagination-page-wrapper">
                                        หน้า {currentPage} / {totalPages}
                                    </span>

                                    <button
                                        type="button"
                                        className="pagination-button"
                                        disabled={currentPage >= totalPages}
                                        onClick={() =>
                                            setCurrentPage((page) =>
                                                Math.min(totalPages, page + 1)
                                            )
                                        }
                                    >
                                        ›
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Create Asset Modal */}
                    {showCreateForm && (
                        <div 
                            className="modal-overlay" 
                            onClick={(e) => {
                                if (e.target === e.currentTarget) {
                                    handleCloseCreateForm();
                                }
                            }}
                        >
                            <div className="surface-card modal-content admin-form-card">

                                <div className="section-heading">
                                    <div className="section-heading-icon">
                                        <Package size={19} />
                                    </div>

                                    <div>
                                        <h2>ลงทะเบียนทรัพย์สิน IT</h2>
                                        <p>กรอกข้อมูลอุปกรณ์ที่ต้องการเพิ่มเข้าระบบ</p>
                                    </div>

                                    <button
                                        type="button"
                                        className="icon-button close-form"
                                        onClick={handleCloseCreateForm}
                                        disabled={saving}
                                        aria-label="ปิดฟอร์ม"
                                    >
                                        <X size={19} />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateAsset}>

                                    <div className="form-grid" style={{ padding: "22px" }}>

                                        {createError && (
                                            <div className="error-banner full-field">
                                                <AlertCircle size={17} />
                                                {createError}
                                            </div>
                                        )}

                                        {/* Asset Name */}
                                        <label className="styled-field">
                                            <span>ชื่ออุปกรณ์ <i>*</i></span>
                                            <input
                                                name="asset_name"
                                                value={assetForm.asset_name}
                                                onChange={handleAssetFormChange}
                                                placeholder="เช่น Notebook Dell Latitude"
                                                required
                                                minLength={2}
                                                maxLength={200}
                                            />
                                        </label>

                                        {/* Category */}
                                        <label className="styled-field">
                                            <span>หมวดหมู่ทรัพย์สิน <i>*</i></span>
                                            <select
                                                name="category_id"
                                                value={assetForm.category_id}
                                                onChange={handleAssetFormChange}
                                                required
                                            >
                                                <option value="">-- เลือกหมวดหมู่ --</option>

                                                {categories.map((category) => (
                                                    <option
                                                        key={category.id}
                                                        value={category.id}
                                                    >
                                                        {category.category_name}
                                                        {" ("}
                                                        {category.tracking_type}
                                                        {")"}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        {/* Brand */}
                                        <label className="styled-field">
                                            <span>ยี่ห้อ (Brand)</span>
                                            <input
                                                name="brand"
                                                value={assetForm.brand}
                                                onChange={handleAssetFormChange}
                                                placeholder="เช่น Dell, HP, Lenovo"
                                            />
                                        </label>

                                        {/* Model */}
                                        <label className="styled-field">
                                            <span>รุ่น (Model)</span>
                                            <input
                                                name="model"
                                                value={assetForm.model}
                                                onChange={handleAssetFormChange}
                                                placeholder="ระบุรุ่นอุปกรณ์"
                                            />
                                        </label>

                                        {/* Serial Number */}
                                        {categories.find(
                                            (category) =>
                                                String(category.id) === String(assetForm.category_id)
                                        )?.tracking_type !== "QUANTITY" && (
                                                <label className="styled-field full-field">
                                                    <span>Serial Number</span>
                                                    <input
                                                        name="serial_number"
                                                        value={assetForm.serial_number}
                                                        onChange={handleAssetFormChange}
                                                        placeholder="ระบุ Serial Number"
                                                    />
                                                </label>
                                            )}

                                        {/* Location */}
                                        <label className="styled-field">
                                            <span>สถานที่จัดเก็บ / ใช้งาน</span>
                                            <input
                                                name="location"
                                                value={assetForm.location}
                                                onChange={handleAssetFormChange}
                                                placeholder="เช่น ห้อง IT, อาคารสำนักงานใหญ่"
                                            />
                                        </label>

                                        {/* Tracking Type */}
                                        <label className="styled-field">
                                            <span>ประเภทการจัดการ</span>
                                            <input
                                                value={
                                                    categories.find(
                                                        (category) =>
                                                            String(category.id) ===
                                                            String(assetForm.category_id)
                                                    )?.tracking_type === "QUANTITY"
                                                        ? "ตามจำนวน (QUANTITY)"
                                                        : assetForm.category_id
                                                            ? "รายชิ้น (INDIVIDUAL)"
                                                            : "กรุณาเลือกหมวดหมู่"
                                                }
                                                disabled
                                            />
                                        </label>

                                        {/* Quantity Fields */}
                                        {categories.find(
                                            (category) =>
                                                String(category.id) === String(assetForm.category_id)
                                        )?.tracking_type === "QUANTITY" && (
                                                <>
                                                    <label className="styled-field">
                                                        <span>จำนวนคงเหลือ <i>*</i></span>
                                                        <input
                                                            type="number"
                                                            name="quantity_on_hand"
                                                            value={assetForm.quantity_on_hand}
                                                            onChange={handleAssetFormChange}
                                                            min="0"
                                                            required
                                                        />
                                                    </label>

                                                    <label className="styled-field">
                                                        <span>จำนวนขั้นต่ำ (Minimum Stock)</span>
                                                        <input
                                                            type="number"
                                                            name="minimum_quantity"
                                                            value={assetForm.minimum_quantity}
                                                            onChange={handleAssetFormChange}
                                                            min="0"
                                                        />
                                                    </label>
                                                </>
                                            )}

                                        {/* Purchase Date */}
                                        <label className="styled-field">
                                            <span>วันที่ซื้อ</span>
                                            <input
                                                type="date"
                                                name="purchase_date"
                                                value={assetForm.purchase_date}
                                                onChange={handleAssetFormChange}
                                            />
                                        </label>

                                        {/* Purchase Price */}
                                        <label className="styled-field">
                                            <span>ราคาซื้อ</span>
                                            <input
                                                type="number"
                                                name="purchase_price"
                                                value={assetForm.purchase_price}
                                                onChange={handleAssetFormChange}
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                            />
                                        </label>

                                        {/* Warranty */}
                                        <label className="styled-field">
                                            <span>วันหมดประกัน</span>
                                            <input
                                                type="date"
                                                name="warranty_expiry"
                                                value={assetForm.warranty_expiry}
                                                onChange={handleAssetFormChange}
                                            />
                                        </label>

                                        {/* Description */}
                                        <label className="styled-field full-field">
                                            <span>รายละเอียดเพิ่มเติม</span>
                                            <textarea
                                                name="description"
                                                value={assetForm.description}
                                                onChange={handleAssetFormChange}
                                                rows={3}
                                                placeholder="รายละเอียดของทรัพย์สิน..."
                                            />
                                        </label>

                                        {/* Asset Image Upload */}
                                        <div className="full-field" style={{
                                            border: "1px solid #e2e8f0",
                                            borderRadius: "12px",
                                            padding: "16px",
                                            background: "#f8fafc",
                                        }}>
                                            <label className="styled-field">
                                                <span>รูปภาพอุปกรณ์</span>

                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    onChange={handleCreateImageChange}
                                                    disabled={saving}
                                                />
                                            </label>

                                            {createImagePreview && (
                                                <div style={{
                                                    marginTop: "14px",
                                                    padding: "12px",
                                                    background: "#ffffff",
                                                    border: "1px dashed #cbd5e1",
                                                    borderRadius: "10px",
                                                    textAlign: "center",
                                                }}>
                                                    <img
                                                        src={createImagePreview}
                                                        alt="Asset Preview"
                                                        style={{
                                                            maxWidth: "100%",
                                                            maxHeight: "250px",
                                                            objectFit: "contain",
                                                            borderRadius: "8px",
                                                        }}
                                                    />

                                                    <p style={{
                                                        marginTop: "10px",
                                                        fontSize: "13px",
                                                        color: "#475569",
                                                    }}>
                                                        {createImageFile?.name}
                                                    </p>

                                                    <button
                                                        type="button"
                                                        className="secondary-button"
                                                        onClick={() => {
                                                            setCreateImageFile(null);
                                                            setCreateImagePreview("");
                                                        }}
                                                        disabled={saving}
                                                    >
                                                        <X size={15} />
                                                        ลบรูปภาพ
                                                    </button>
                                                </div>
                                            )}

                                            <small style={{
                                                display: "block",
                                                marginTop: "10px",
                                                color: "#64748b",
                                            }}>
                                                รองรับ JPG, JPEG, PNG และ WEBP ขนาดไม่เกิน 5 MB
                                                (1 รูปต่อ 1 Asset)
                                            </small>
                                        </div>

                                        <div className="form-actions full-field">
                                            <button
                                                type="submit"
                                                className="primary-button"
                                                disabled={saving || categories.length === 0}
                                            >
                                                <Save size={16} />
                                                {saving ? "กำลังบันทึก..." : "บันทึกทรัพย์สิน"}
                                            </button>

                                            <button
                                                type="button"
                                                className="secondary-button"
                                                onClick={handleCloseCreateForm}
                                                disabled={saving}
                                            >
                                                ยกเลิก
                                            </button>
                                        </div>

                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Asset Detail Modal */}
                    {showDetail && (
                        <div 
                            className="modal-overlay" 
                            onClick={(e) => {
                                if (e.target === e.currentTarget) {
                                    handleCloseDetail();
                                }
                            }}
                        >
                            <div className="surface-card modal-content admin-form-card">

                                <div className="section-heading">
                                    <div className="section-heading-icon">
                                        <Package size={19} />
                                    </div>

                                    <div>
                                        <h2>รายละเอียดทรัพย์สิน IT</h2>
                                        <p>Asset Detail</p>
                                    </div>

                                    <button
                                        type="button"
                                        className="icon-button close-form"
                                        onClick={handleCloseDetail}
                                        disabled={editSaving}
                                        aria-label="ปิด"
                                    >
                                        <X size={19} />
                                    </button>
                                </div>

                                <div style={{ padding: "22px" }}>

                                    {detailLoading && (
                                        <div className="empty-state">
                                            กำลังโหลดรายละเอียดทรัพย์สิน...
                                        </div>
                                    )}

                                    {detailError && (
                                        <div className="error-banner">
                                            <AlertCircle size={17} />
                                            {detailError}
                                        </div>
                                    )}

                                    {selectedAsset && !detailLoading && (
                                        <>
                                            {/* Asset Image */}
                                            <div
                                                className="full-field"
                                                style={{
                                                    marginBottom: "24px",
                                                    padding: "18px",
                                                    border: "1px solid #e2e8f0",
                                                    borderRadius: "12px",
                                                    background: "#f8fafc",
                                                }}
                                            >
                                                <h3 style={{ marginBottom: "14px" }}>
                                                    รูปภาพอุปกรณ์
                                                </h3>

                                                <div
                                                    style={{
                                                        width: "100%",
                                                        minHeight: "220px",
                                                        display: "flex",
                                                        justifyContent: "center",
                                                        alignItems: "center",
                                                        background: "#ffffff",
                                                        border: "1px dashed #cbd5e1",
                                                        borderRadius: "10px",
                                                        overflow: "hidden",
                                                        marginBottom: "16px",
                                                    }}
                                                >
                                                    {(imagePreview || selectedAsset.image_path) ? (
                                                        <img
                                                            src={
                                                                imagePreview ||
                                                                `${API_ORIGIN}/${selectedAsset.image_path.replace(/^\/+/, "")}`
                                                            }
                                                            alt={selectedAsset.asset_name}
                                                            style={{
                                                                maxWidth: "100%",
                                                                maxHeight: "350px",
                                                                objectFit: "contain",
                                                            }}
                                                        />
                                                    ) : (
                                                        <div
                                                            style={{
                                                                textAlign: "center",
                                                                color: "#94a3b8",
                                                                padding: "30px",
                                                            }}
                                                        >
                                                            <Package size={48} />
                                                            <p>ยังไม่มีรูปภาพอุปกรณ์</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <label className="styled-field">
                                                    <span>เลือกรูปภาพ (JPG, PNG, WEBP)</span>

                                                    <input
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/webp"
                                                        onChange={handleSelectAssetImage}
                                                        disabled={imageUploading}
                                                    />
                                                </label>

                                                {imageFile && (
                                                    <p style={{
                                                        fontSize: "13px",
                                                        color: "#64748b",
                                                        marginTop: "8px",
                                                    }}>
                                                        ไฟล์ที่เลือก: {imageFile.name}
                                                    </p>
                                                )}

                                                {imageUploadError && (
                                                    <div className="error-banner" style={{ marginTop: "12px" }}>
                                                        <AlertCircle size={17} />
                                                        {imageUploadError}
                                                    </div>
                                                )}

                                                {imageUploadSuccess && (
                                                    <div className="success-banner" style={{ marginTop: "12px" }}>
                                                        <Package size={17} />
                                                        {imageUploadSuccess}
                                                    </div>
                                                )}

                                                <div className="form-actions" style={{ marginTop: "14px" }}>
                                                    <button
                                                        type="button"
                                                        className="primary-button"
                                                        onClick={handleUploadAssetImage}
                                                        disabled={!imageFile || imageUploading}
                                                    >
                                                        <Upload size={16} />
                                                        {imageUploading
                                                            ? "กำลัง Upload..."
                                                            : selectedAsset.image_path
                                                                ? "เปลี่ยนรูปภาพ"
                                                                : "Upload รูปภาพ"}
                                                    </button>
                                                </div>

                                                <small style={{ color: "#64748b" }}>
                                                    รองรับ JPG, PNG, WEBP ขนาดไม่เกิน 5 MB
                                                    และจัดเก็บได้ 1 รูปต่อ Asset
                                                </small>
                                            </div>
                                            <div className="form-grid">

                                                <label className="styled-field">
                                                    <span>Asset Code</span>
                                                    <input
                                                        value={selectedAsset.asset_code || "-"}
                                                        disabled
                                                    />
                                                </label>

                                                <label className="styled-field">
                                                    <span>ชื่ออุปกรณ์</span>
                                                    <input
                                                        value={selectedAsset.asset_name || "-"}
                                                        disabled
                                                    />
                                                </label>

                                                <label className="styled-field">
                                                    <span>หมวดหมู่</span>
                                                    <input
                                                        value={
                                                            categoryMap[selectedAsset.category_id] ||
                                                            `Category #${selectedAsset.category_id}`
                                                        }
                                                        disabled
                                                    />
                                                </label>

                                                <label className="styled-field">
                                                    <span>ประเภทการจัดการ</span>
                                                    <input
                                                        value={selectedAsset.tracking_type}
                                                        disabled
                                                    />
                                                </label>

                                                <label className="styled-field">
                                                    <span>ยี่ห้อ</span>
                                                    <input
                                                        value={selectedAsset.brand || "-"}
                                                        disabled
                                                    />
                                                </label>

                                                <label className="styled-field">
                                                    <span>รุ่น</span>
                                                    <input
                                                        value={selectedAsset.model || "-"}
                                                        disabled
                                                    />
                                                </label>

                                                <label className="styled-field full-field">
                                                    <span>Serial Number</span>
                                                    <input
                                                        value={selectedAsset.serial_number || "-"}
                                                        disabled
                                                    />
                                                </label>

                                                <label className="styled-field">
                                                    <span>สถานที่</span>
                                                    <input
                                                        value={selectedAsset.location || "-"}
                                                        disabled
                                                    />
                                                </label>

                                                <label className="styled-field">
                                                    <span>สถานะ</span>
                                                    <input
                                                        value={
                                                            STATUS_LABELS[selectedAsset.status] ||
                                                            selectedAsset.status
                                                        }
                                                        disabled
                                                    />
                                                </label>

                                                <label className="styled-field">
                                                    <span>จำนวนคงเหลือ</span>
                                                    <input
                                                        value={
                                                            selectedAsset.tracking_type === "QUANTITY"
                                                                ? selectedAsset.quantity_on_hand
                                                                : "-"
                                                        }
                                                        disabled
                                                    />
                                                </label>

                                                <label className="styled-field">
                                                    <span>จำนวนขั้นต่ำ</span>
                                                    <input
                                                        value={
                                                            selectedAsset.tracking_type === "QUANTITY"
                                                                ? selectedAsset.minimum_quantity
                                                                : "-"
                                                        }
                                                        disabled
                                                    />
                                                </label>

                                                <label className="styled-field">
                                                    <span>วันที่ซื้อ</span>
                                                    <input
                                                        value={selectedAsset.purchase_date || "-"}
                                                        disabled
                                                    />
                                                </label>

                                                <label className="styled-field">
                                                    <span>ราคาซื้อ</span>
                                                    <input
                                                        value={
                                                            selectedAsset.purchase_price != null
                                                                ? Number(
                                                                    selectedAsset.purchase_price
                                                                ).toLocaleString("th-TH", {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2,
                                                                })
                                                                : "-"
                                                        }
                                                        disabled
                                                    />
                                                </label>

                                                <label className="styled-field">
                                                    <span>วันหมดประกัน</span>
                                                    <input
                                                        value={selectedAsset.warranty_expiry || "-"}
                                                        disabled
                                                    />
                                                </label>

                                                <label className="styled-field full-field">
                                                    <span>รายละเอียดเพิ่มเติม</span>
                                                    <textarea
                                                        value={selectedAsset.description || "-"}
                                                        rows={3}
                                                        disabled
                                                    />
                                                </label>

                                                <label className="styled-field full-field">
                                                    <span>วันที่ลงทะเบียน</span>
                                                    <input
                                                        value={
                                                            selectedAsset.created_at
                                                                ? new Date(
                                                                    selectedAsset.created_at
                                                                ).toLocaleString("th-TH")
                                                                : "-"
                                                        }
                                                        disabled
                                                    />
                                                </label>

                                            </div>

                                            <div className="form-actions">
                                                {selectedAsset.status !== "DISPOSED" && (
                                                    <button
                                                        type="button"
                                                        className="primary-button"
                                                        onClick={handleOpenEdit}
                                                    >
                                                        <Pencil size={16} />
                                                        แก้ไขข้อมูล
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="secondary-button"
                                                    onClick={handleCloseDetail}
                                                >
                                                    ปิด
                                                </button>
                                            </div>

                                            {/* Asset Assignment / Return / History */}
                                            {selectedAsset.tracking_type === "INDIVIDUAL" && (
                                                <div className="full-field" style={{ marginTop: "24px" }}>

                                                    <div className="section-heading">
                                                        <div className="section-heading-icon">
                                                            <Users size={19} />
                                                        </div>
                                                        <div>
                                                            <h2>จัดการการเบิก-คืนทรัพย์สิน</h2>
                                                            <p>Asset Assignment & Return</p>
                                                        </div>
                                                    </div>

                                                    {assignmentError && (
                                                        <div className="error-banner">
                                                            <AlertCircle size={17} />
                                                            {assignmentError}
                                                        </div>
                                                    )}

                                                    {assignmentSuccess && (
                                                        <div className="success-banner">
                                                            <Package size={17} />
                                                            {assignmentSuccess}
                                                        </div>
                                                    )}

                                                    {assignmentLoading ? (
                                                        <div className="empty-state">
                                                            กำลังโหลดข้อมูลการเบิก-คืน...
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {/* Assign Asset */}
                                                            {selectedAsset.status === "AVAILABLE" && (
                                                                <form
                                                                    onSubmit={handleAssignAsset}
                                                                    className="surface-card"
                                                                    style={{ padding: "18px", marginBottom: "18px" }}
                                                                >
                                                                    <h3 style={{ marginBottom: "16px" }}>
                                                                        <UserPlus
                                                                            size={17}
                                                                            style={{
                                                                                display: "inline",
                                                                                marginRight: "8px",
                                                                            }}
                                                                        />
                                                                        เบิกจ่ายทรัพย์สิน
                                                                    </h3>

                                                                    <div className="form-grid">

                                                                        <div className="styled-field full-field">
                                                                            <span>ผู้รับทรัพย์สิน *</span>

                                                                            <div style={{ position: "relative" }}>

                                                                                <input
                                                                                    type="text"
                                                                                    value={assignUserSearch}
                                                                                    placeholder="พิมพ์ค้นหาชื่อ หรือ Username..."
                                                                                    autoComplete="off"
                                                                                    onFocus={() => setShowUserOptions(true)}
                                                                                    onChange={(event) => {
                                                                                        setAssignUserSearch(event.target.value);
                                                                                        setAssignedTo("");
                                                                                        setShowUserOptions(true);
                                                                                    }}
                                                                                    onKeyDown={(event) => {
                                                                                        if (event.key === "Escape") {
                                                                                            setShowUserOptions(false);
                                                                                        }
                                                                                    }}
                                                                                />

                                                                                {showUserOptions && (
                                                                                    <div
                                                                                        style={{
                                                                                            position: "absolute",
                                                                                            top: "calc(100% + 5px)",
                                                                                            left: 0,
                                                                                            right: 0,
                                                                                            zIndex: 100,
                                                                                            background: "#ffffff",
                                                                                            border: "1px solid #dbe3ef",
                                                                                            borderRadius: "10px",
                                                                                            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                                                                                            maxHeight: "220px",
                                                                                            overflowY: "auto",
                                                                                        }}
                                                                                    >
                                                                                        {filteredAssignableUsers.length > 0 ? (
                                                                                            filteredAssignableUsers.map((item) => (
                                                                                                <button
                                                                                                    key={item.id}
                                                                                                    type="button"
                                                                                                    onMouseDown={(event) => event.preventDefault()}
                                                                                                    onClick={() =>
                                                                                                        handleSelectAssignableUser(item)
                                                                                                    }
                                                                                                    style={{
                                                                                                        display: "block",
                                                                                                        width: "100%",
                                                                                                        padding: "12px 14px",
                                                                                                        border: "none",
                                                                                                        borderBottom: "1px solid #edf0f5",
                                                                                                        background:
                                                                                                            String(assignedTo) === String(item.id)
                                                                                                                ? "#eff6ff"
                                                                                                                : "#ffffff",
                                                                                                        textAlign: "left",
                                                                                                        cursor: "pointer",
                                                                                                    }}
                                                                                                >
                                                                                                    <div style={{ fontWeight: 600 }}>
                                                                                                        {item.full_name || item.username}
                                                                                                    </div>

                                                                                                    <div
                                                                                                        style={{
                                                                                                            fontSize: "12px",
                                                                                                            color: "#8492a6",
                                                                                                            marginTop: "3px",
                                                                                                        }}
                                                                                                    >
                                                                                                        {item.username}
                                                                                                        {item.department
                                                                                                            ? ` • ${item.department}`
                                                                                                            : ""}
                                                                                                    </div>
                                                                                                </button>
                                                                                            ))
                                                                                        ) : (
                                                                                            <div
                                                                                                style={{
                                                                                                    padding: "15px",
                                                                                                    textAlign: "center",
                                                                                                    color: "#8492a6",
                                                                                                }}
                                                                                            >
                                                                                                ไม่พบรายชื่อผู้ใช้งาน
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                )}

                                                                            </div>
                                                                        </div>

                                                                        <label className="styled-field full-field">
                                                                            <span>หมายเหตุ</span>

                                                                            <textarea
                                                                                value={assignmentNote}
                                                                                onChange={(event) =>
                                                                                    setAssignmentNote(event.target.value)
                                                                                }
                                                                                rows={2}
                                                                                placeholder="ระบุรายละเอียดการเบิก..."
                                                                            />
                                                                        </label>

                                                                        <div className="form-actions full-field">
                                                                            <button
                                                                                type="submit"
                                                                                className="primary-button"
                                                                                disabled={
                                                                                    assignmentSaving ||
                                                                                    assignableUsers.length === 0
                                                                                }
                                                                            >
                                                                                <UserPlus size={16} />
                                                                                {assignmentSaving
                                                                                    ? "กำลังบันทึก..."
                                                                                    : "ยืนยันการเบิก"}
                                                                            </button>
                                                                        </div>

                                                                    </div>
                                                                </form>
                                                            )}

                                                            {/* Return Asset */}
                                                            {selectedAsset.status === "ASSIGNED" && (
                                                                <form
                                                                    onSubmit={handleReturnAsset}
                                                                    className="surface-card"
                                                                    style={{ padding: "18px", marginBottom: "18px" }}
                                                                >
                                                                    <h3 style={{ marginBottom: "16px" }}>
                                                                        <RotateCcw
                                                                            size={17}
                                                                            style={{
                                                                                display: "inline",
                                                                                marginRight: "8px",
                                                                            }}
                                                                        />
                                                                        รับคืนทรัพย์สิน
                                                                    </h3>

                                                                    <div className="form-grid">

                                                                        <label className="styled-field full-field">
                                                                            <span>ผู้ครอบครองปัจจุบัน</span>
                                                                            <input
                                                                                value={
                                                                                    activeAssignment
                                                                                        ? userMap[activeAssignment.assigned_to] ||
                                                                                        `User #${activeAssignment.assigned_to}`
                                                                                        : "ไม่พบข้อมูลผู้ครอบครอง"
                                                                                }
                                                                                disabled
                                                                            />
                                                                        </label>

                                                                        <label className="styled-field full-field">
                                                                            <span>หมายเหตุการรับคืน</span>

                                                                            <textarea
                                                                                value={returnNote}
                                                                                onChange={(event) =>
                                                                                    setReturnNote(event.target.value)
                                                                                }
                                                                                rows={2}
                                                                                placeholder="ระบุสภาพอุปกรณ์หรือรายละเอียดการคืน..."
                                                                            />
                                                                        </label>

                                                                        <div className="form-actions full-field">
                                                                            <button
                                                                                type="submit"
                                                                                className="primary-button"
                                                                                disabled={
                                                                                    assignmentSaving ||
                                                                                    !activeAssignment
                                                                                }
                                                                            >
                                                                                <RotateCcw size={16} />
                                                                                {assignmentSaving
                                                                                    ? "กำลังบันทึก..."
                                                                                    : "ยืนยันการรับคืน"}
                                                                            </button>
                                                                        </div>

                                                                    </div>
                                                                </form>
                                                            )}

                                                            {/* Assignment History */}
                                                            <div
                                                                className="surface-card"
                                                                style={{ padding: "18px" }}
                                                            >
                                                                <h3 style={{ marginBottom: "16px" }}>
                                                                    <History
                                                                        size={17}
                                                                        style={{
                                                                            display: "inline",
                                                                            marginRight: "8px",
                                                                        }}
                                                                    />
                                                                    ประวัติการเบิก-คืน
                                                                </h3>

                                                                {assignments.length === 0 ? (
                                                                    <div className="empty-state">
                                                                        ยังไม่มีประวัติการเบิก-คืนทรัพย์สิน
                                                                    </div>
                                                                ) : (
                                                                    <div className="table-scroll">
                                                                        <table className="modern-table">
                                                                            <thead>
                                                                                <tr>
                                                                                    <th>ผู้รับทรัพย์สิน</th>
                                                                                    <th>ผู้ทำรายการเบิก</th>
                                                                                    <th>วันที่เบิก</th>
                                                                                    <th>ผู้รับคืน</th>
                                                                                    <th>วันที่คืน</th>
                                                                                    <th>สถานะ</th>
                                                                                    <th>หมายเหตุ</th>
                                                                                </tr>
                                                                            </thead>

                                                                            <tbody>
                                                                                {assignments.map((item) => (
                                                                                    <tr key={item.id}>
                                                                                        <td>
                                                                                            {userMap[item.assigned_to] ||
                                                                                                `User #${item.assigned_to}`}
                                                                                        </td>

                                                                                        <td>
                                                                                            {userMap[item.assigned_by] ||
                                                                                                `User #${item.assigned_by}`}
                                                                                        </td>

                                                                                        <td>
                                                                                            {item.assigned_at
                                                                                                ? new Date(
                                                                                                    item.assigned_at
                                                                                                ).toLocaleString("th-TH")
                                                                                                : "-"}
                                                                                        </td>

                                                                                        <td>
                                                                                            {item.returned_by
                                                                                                ? userMap[item.returned_by] ||
                                                                                                `User #${item.returned_by}`
                                                                                                : "-"}
                                                                                        </td>

                                                                                        <td>
                                                                                            {item.returned_at
                                                                                                ? new Date(
                                                                                                    item.returned_at
                                                                                                ).toLocaleString("th-TH")
                                                                                                : "-"}
                                                                                        </td>

                                                                                        <td>
                                                                                            <span
                                                                                                className={`status-pill ${
                                                                                                    item.returned_at
                                                                                                        ? "status-resolved"
                                                                                                        : "status-assigned"
                                                                                                }`}
                                                                                            >
                                                                                                <span />
                                                                                                {item.returned_at
                                                                                                    ? "คืนแล้ว"
                                                                                                    : "กำลังถือครอง"}
                                                                                            </span>
                                                                                        </td>

                                                                                        <td>
                                                                                            {item.note || "-"}
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}

                                            {/* Quantity Stock Issue / Receive / History */}
                                            {selectedAsset.tracking_type === "QUANTITY" && (
                                                <div className="full-field" style={{ marginTop: "24px" }}>
                                                    <div className="section-heading">
                                                        <div className="section-heading-icon"><Boxes size={19} /></div>
                                                        <div>
                                                            <h2>เบิกจ่าย / รับสินค้าเข้าคลัง</h2>
                                                            <p>Stock Issue, Receive & Transaction History</p>
                                                        </div>
                                                    </div>

                                                    <div className="surface-card" style={{ padding: "18px", marginBottom: "20px" }}>
                                                        <div className="form-grid">
                                                            <label className="styled-field">
                                                                <span>Stock คงเหลือ</span>
                                                                <input value={`${selectedAsset.quantity_on_hand ?? 0} ชิ้น`} disabled />
                                                            </label>
                                                            <label className="styled-field">
                                                                <span>จำนวนขั้นต่ำ</span>
                                                                <input value={`${selectedAsset.minimum_quantity ?? 0} ชิ้น`} disabled />
                                                            </label>
                                                            <label className="styled-field">
                                                                <span>สถานะ Stock</span>
                                                                <input
                                                                    value={
                                                                        Number(selectedAsset.quantity_on_hand ?? 0) <= Number(selectedAsset.minimum_quantity ?? 0)
                                                                            ? "Low Stock"
                                                                            : "ปกติ"
                                                                    }
                                                                    disabled
                                                                />
                                                            </label>
                                                        </div>
                                                    </div>

                                                    {stockError && (
                                                        <div className="error-banner" style={{ marginBottom: "14px" }}>
                                                            <AlertCircle size={17} /> {stockError}
                                                        </div>
                                                    )}
                                                    {stockSuccess && (
                                                        <div className="success-banner" style={{ marginBottom: "14px" }}>
                                                            <Package size={17} /> {stockSuccess}
                                                        </div>
                                                    )}

                                                    <form onSubmit={handleStockTransaction} className="surface-card" style={{ padding: "18px", marginBottom: "20px" }}>
                                                        <h3 style={{ marginBottom: "16px" }}>ทำรายการ Stock</h3>
                                                        <div className="form-grid">
                                                            <label className="styled-field">
                                                                <span>ประเภทรายการ *</span>
                                                                <select
                                                                    value={stockType}
                                                                    onChange={(event) => {
                                                                        setStockType(event.target.value);
                                                                        setStockRecipient("");
                                                                        setStockError("");
                                                                    }}
                                                                >
                                                                    <option value="ISSUE">เบิกสินค้า (ISSUE)</option>
                                                                    <option value="RECEIVE">รับสินค้าเข้า (RECEIVE)</option>
                                                                </select>
                                                            </label>
                                                            <label className="styled-field">
                                                                <span>จำนวน *</span>
                                                                <input type="number" min="1" step="1" value={stockQuantity}
                                                                    onChange={(event) => setStockQuantity(event.target.value)} required />
                                                            </label>

                                                            {stockType === "ISSUE" && (
                                                                <label className="styled-field full-field">
                                                                    <span>ผู้รับอุปกรณ์ *</span>
                                                                    <select value={stockRecipient}
                                                                        onChange={(event) => setStockRecipient(event.target.value)} required>
                                                                        <option value="">-- เลือกผู้รับอุปกรณ์ --</option>
                                                                        {assignableUsers.map((item) => (
                                                                            <option key={item.id} value={item.id}>
                                                                                {item.full_name || item.username} ({item.username})
                                                                                {item.department ? ` - ${item.department}` : ""}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </label>
                                                            )}

                                                            <label className="styled-field">
                                                                <span>เลขที่เอกสารอ้างอิง</span>
                                                                <input value={stockReference} onChange={(event) => setStockReference(event.target.value)}
                                                                    maxLength={100} placeholder="เช่น PO-2026-001" />
                                                            </label>
                                                            <label className="styled-field">
                                                                <span>หมายเหตุ</span>
                                                                <input value={stockNote} onChange={(event) => setStockNote(event.target.value)}
                                                                    placeholder="รายละเอียดเพิ่มเติม" />
                                                            </label>
                                                            <div className="form-actions full-field">
                                                                <button type="submit" className="primary-button"
                                                                    disabled={stockSaving || stockLoading || (stockType === "ISSUE" && assignableUsers.length === 0)}>
                                                                    {stockSaving ? "กำลังบันทึก..." :
                                                                        stockType === "ISSUE" ? "ยืนยันการเบิกสินค้า" : "ยืนยันรับสินค้าเข้า"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </form>

                                                    <div className="surface-card" style={{ padding: "18px" }}>
                                                        <h3 style={{ marginBottom: "16px" }}>
                                                            <History size={17} style={{ display: "inline", marginRight: "8px" }} />
                                                            ประวัติ Stock Transaction
                                                        </h3>
                                                        {stockLoading ? (
                                                            <div className="empty-state">กำลังโหลดประวัติ Stock...</div>
                                                        ) : stockTransactions.length === 0 ? (
                                                            <div className="empty-state">ยังไม่มีประวัติการรับเข้า / เบิกจ่าย</div>
                                                        ) : (
                                                            <div className="table-scroll">
                                                                <table className="modern-table">
                                                                    <thead>
                                                                        <tr>
                                                                            <th>วันที่ทำรายการ</th><th>ประเภท</th><th>จำนวน</th>
                                                                            <th>ก่อนทำรายการ</th><th>หลังทำรายการ</th>
                                                                            <th>ผู้รับ</th><th>เลขที่อ้างอิง</th><th>ผู้ทำรายการ</th><th>หมายเหตุ</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {stockTransactions.map((item) => (
                                                                            <tr key={item.id}>
                                                                                <td>{item.transaction_date ? new Date(item.transaction_date).toLocaleString("th-TH") : "-"}</td>
                                                                                <td>
                                                                                    <span className={`status-pill ${item.transaction_type === "RECEIVE" ? "status-resolved" : "status-assigned"}`}>
                                                                                        <span />{item.transaction_type === "RECEIVE" ? "รับเข้า" : "เบิกออก"}
                                                                                    </span>
                                                                                </td>
                                                                                <td>{item.quantity}</td>
                                                                                <td>{item.quantity_before ?? "-"}</td>
                                                                                <td>{item.quantity_after ?? "-"}</td>
                                                                                <td>{item.issued_to ? userMap[item.issued_to] || `User #${item.issued_to}` : "-"}</td>
                                                                                <td>{item.reference_no || "-"}</td>
                                                                                <td>{userMap[item.performed_by] || `User #${item.performed_by}`}</td>
                                                                                <td>{item.note || "-"}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Edit Asset Modal */}
                    {showEditForm && selectedAsset && (
                        <div 
                            className="modal-overlay" 
                            onClick={(e) => {
                                if (e.target === e.currentTarget) {
                                    handleCloseEdit();
                                }
                            }}
                        >
                            <div className="surface-card modal-content admin-form-card">

                                <div className="section-heading">
                                    <div className="section-heading-icon">
                                        <Pencil size={19} />
                                    </div>

                                    <div>
                                        <h2>แก้ไขข้อมูลทรัพย์สิน</h2>
                                        <p>
                                            {selectedAsset.asset_code}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        className="icon-button close-form"
                                        onClick={handleCloseEdit}
                                        disabled={editSaving}
                                        aria-label="ปิด"
                                    >
                                        <X size={19} />
                                    </button>
                                </div>

                                <form onSubmit={handleUpdateAsset}>
                                    <div
                                        className="form-grid"
                                        style={{ padding: "22px" }}
                                    >

                                        {editError && (
                                            <div className="error-banner full-field">
                                                <AlertCircle size={17} />
                                                {editError}
                                            </div>
                                        )}

                                        <label className="styled-field">
                                            <span>Asset Code</span>
                                            <input
                                                value={selectedAsset.asset_code}
                                                disabled
                                            />
                                        </label>

                                        <label className="styled-field">
                                            <span>ชื่ออุปกรณ์ *</span>
                                            <input
                                                name="asset_name"
                                                value={editForm.asset_name}
                                                onChange={handleEditFormChange}
                                                minLength={2}
                                                maxLength={200}
                                                required
                                            />
                                        </label>

                                        <label className="styled-field">
                                            <span>หมวดหมู่</span>
                                            <select
                                                name="category_id"
                                                value={editForm.category_id}
                                                onChange={handleEditFormChange}
                                            >
                                                {!categories.some(
                                                    (category) =>
                                                        String(category.id) ===
                                                        String(editForm.category_id)
                                                ) && (
                                                    <option value={editForm.category_id}>
                                                        หมวดหมู่ปัจจุบัน
                                                    </option>
                                                )}

                                                {categories
                                                    .filter(
                                                        (category) =>
                                                            category.tracking_type ===
                                                            selectedAsset.tracking_type
                                                    )
                                                    .map((category) => (
                                                        <option
                                                            key={category.id}
                                                            value={category.id}
                                                        >
                                                            {category.category_name}
                                                        </option>
                                                    ))}
                                            </select>
                                        </label>

                                        <label className="styled-field">
                                            <span>ประเภทการจัดการ</span>
                                            <input
                                                value={selectedAsset.tracking_type}
                                                disabled
                                            />
                                        </label>

                                        <label className="styled-field">
                                            <span>ยี่ห้อ (Brand)</span>
                                            <input
                                                name="brand"
                                                value={editForm.brand}
                                                onChange={handleEditFormChange}
                                            />
                                        </label>

                                        <label className="styled-field">
                                            <span>รุ่น (Model)</span>
                                            <input
                                                name="model"
                                                value={editForm.model}
                                                onChange={handleEditFormChange}
                                            />
                                        </label>

                                        {selectedAsset.tracking_type === "INDIVIDUAL" && (
                                            <label className="styled-field full-field">
                                                <span>Serial Number</span>
                                                <input
                                                    name="serial_number"
                                                    value={editForm.serial_number}
                                                    onChange={handleEditFormChange}
                                                />
                                            </label>
                                        )}

                                        <label className="styled-field">
                                            <span>สถานที่จัดเก็บ / ใช้งาน</span>
                                            <input
                                                name="location"
                                                value={editForm.location}
                                                onChange={handleEditFormChange}
                                            />
                                        </label>

                                        {selectedAsset.tracking_type === "QUANTITY" && (
                                            <>
                                                <label className="styled-field">
                                                    <span>จำนวนคงเหลือ</span>
                                                    <input
                                                        value={selectedAsset.quantity_on_hand}
                                                        disabled
                                                    />
                                                </label>

                                                <label className="styled-field">
                                                    <span>จำนวนขั้นต่ำ</span>
                                                    <input
                                                        type="number"
                                                        name="minimum_quantity"
                                                        value={editForm.minimum_quantity}
                                                        onChange={handleEditFormChange}
                                                        min="0"
                                                        step="1"
                                                    />
                                                </label>
                                            </>
                                        )}

                                        <label className="styled-field">
                                            <span>วันที่ซื้อ</span>
                                            <input
                                                type="date"
                                                name="purchase_date"
                                                value={editForm.purchase_date || ""}
                                                onChange={handleEditFormChange}
                                            />
                                        </label>

                                        <label className="styled-field">
                                            <span>ราคาซื้อ</span>
                                            <input
                                                type="number"
                                                name="purchase_price"
                                                value={editForm.purchase_price}
                                                onChange={handleEditFormChange}
                                                min="0"
                                                step="0.01"
                                            />
                                        </label>

                                        <label className="styled-field">
                                            <span>วันหมดประกัน</span>
                                            <input
                                                type="date"
                                                name="warranty_expiry"
                                                value={editForm.warranty_expiry || ""}
                                                onChange={handleEditFormChange}
                                            />
                                        </label>

                                        <label className="styled-field full-field">
                                            <span>รายละเอียดเพิ่มเติม</span>
                                            <textarea
                                                name="description"
                                                value={editForm.description}
                                                onChange={handleEditFormChange}
                                                rows={3}
                                            />
                                        </label>

                                        <div className="form-actions full-field">
                                            <button
                                                type="submit"
                                                className="primary-button"
                                                disabled={editSaving}
                                            >
                                                <Save size={16} />
                                                {editSaving
                                                    ? "กำลังบันทึก..."
                                                    : "บันทึกการแก้ไข"}
                                            </button>

                                            <button
                                                type="button"
                                                className="secondary-button"
                                                onClick={handleCloseEdit}
                                                disabled={editSaving}
                                            >
                                                ยกเลิก
                                            </button>
                                        </div>

                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    <footer className="dashboard-footer">
                        <span>
                            © {new Date().getFullYear()} OSX IT Service Desk
                        </span>
                        <span>
                            ระบบจัดการทรัพย์สินเทคโนโลยีสารสนเทศ
                        </span>
                    </footer>
                </div>
            </main>
        </div>
    );
}