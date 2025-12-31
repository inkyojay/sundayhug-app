/**
 * B2B 문서 생성 API
 * - 국문 견적서
 * - Proforma Invoice
 * - Commercial Invoice
 * - Packing List
 */
import { renderToBuffer } from "@react-pdf/renderer";
import type { Route } from "./+types/generate-document";

import makeServerClient from "~/core/lib/supa-client.server";
import {
  QuoteKRDocument,
  ProformaInvoiceDocument,
  CommercialInvoiceDocument,
  PackingListDocument,
} from "../lib/pdf-templates";

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();

  const documentType = formData.get("document_type") as string;
  const orderId = formData.get("order_id") as string;
  const shipmentId = formData.get("shipment_id") as string | null;

  if (!documentType || !orderId) {
    return new Response(JSON.stringify({ error: "Missing required parameters" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 주문 정보 조회
    const { data: order, error: orderError } = await supabase
      .from("b2b_orders")
      .select(`
        *,
        customer:b2b_customers(
          id, customer_code, company_name, company_name_en, business_type,
          contact_name, contact_phone, contact_email,
          address, address_en, shipping_address, shipping_address_en,
          country_code
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 주문 품목 조회
    const { data: items } = await supabase
      .from("b2b_order_items")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at");

    // 회사 정보 (실제로는 설정에서 가져와야 함)
    const company = {
      name: "썬데이허그 (Sundayhug Co., Ltd.)",
      address: "서울시 강남구 (Seoul, South Korea)",
      phone: "+82-2-1234-5678",
      email: "export@sundayhug.com",
      registrationNo: "000-00-00000",
    };

    let pdfBuffer: Buffer;
    let filename: string;

    switch (documentType) {
      case "quote_kr": {
        // 국문 견적서
        const doc = QuoteKRDocument({
          order: {
            order_number: order.order_number,
            order_date: order.order_date,
            quote_valid_until: order.quote_valid_until,
            subtotal: order.subtotal,
            discount_amount: order.discount_amount,
            shipping_cost: order.shipping_cost,
            tax_amount: order.tax_amount,
            total_amount: order.total_amount,
            payment_terms: order.payment_terms,
            customer_notes: order.customer_notes,
          },
          customer: {
            company_name: order.customer?.company_name || "",
            contact_name: order.customer?.contact_name,
            contact_phone: order.customer?.contact_phone,
            contact_email: order.customer?.contact_email,
            address: order.customer?.address,
          },
          items: items || [],
          company: {
            name: "썬데이허그",
            address: company.address.split(" (")[0],
            phone: company.phone,
            email: company.email,
            registrationNo: company.registrationNo,
          },
        });
        pdfBuffer = await renderToBuffer(doc);
        filename = `견적서_${order.order_number}.pdf`;
        break;
      }

      case "proforma_invoice": {
        // Proforma Invoice
        const doc = ProformaInvoiceDocument({
          order: {
            order_number: order.order_number,
            order_date: order.order_date,
            quote_valid_until: order.quote_valid_until,
            currency: order.currency,
            subtotal: order.subtotal,
            discount_amount: order.discount_amount,
            shipping_cost: order.shipping_cost,
            tax_amount: order.tax_amount,
            total_amount: order.total_amount,
            payment_terms: order.payment_terms,
            shipping_address_en: order.shipping_address_en,
            customer_notes: order.customer_notes,
          },
          customer: {
            company_name: order.customer?.company_name || "",
            company_name_en: order.customer?.company_name_en,
            contact_name: order.customer?.contact_name,
            contact_email: order.customer?.contact_email,
            address_en: order.customer?.address_en,
            country_code: order.customer?.country_code,
          },
          items: items || [],
          company: {
            name: "Sundayhug Co., Ltd.",
            address: "Seoul, South Korea",
            phone: company.phone,
            email: company.email,
          },
        });
        pdfBuffer = await renderToBuffer(doc);
        filename = `ProformaInvoice_${order.order_number}.pdf`;
        break;
      }

      case "commercial_invoice": {
        // Commercial Invoice
        const doc = CommercialInvoiceDocument({
          order: {
            order_number: order.order_number,
            order_date: order.order_date,
            commercial_invoice_no: order.commercial_invoice_no,
            currency: order.currency,
            subtotal: order.subtotal,
            discount_amount: order.discount_amount,
            shipping_cost: order.shipping_cost,
            tax_amount: order.tax_amount,
            total_amount: order.total_amount,
            payment_terms: order.payment_terms,
            shipping_address_en: order.shipping_address_en,
          },
          customer: {
            company_name: order.customer?.company_name || "",
            company_name_en: order.customer?.company_name_en,
            contact_name: order.customer?.contact_name,
            contact_email: order.customer?.contact_email,
            address_en: order.customer?.address_en,
            country_code: order.customer?.country_code,
          },
          items: items || [],
          company: {
            name: "Sundayhug Co., Ltd.",
            address: "Seoul, South Korea",
            phone: company.phone,
            email: company.email,
          },
        });
        pdfBuffer = await renderToBuffer(doc);
        filename = `CommercialInvoice_${order.order_number}.pdf`;
        break;
      }

      case "packing_list": {
        // Packing List - 출고 정보 필요
        if (!shipmentId) {
          return new Response(JSON.stringify({ error: "Shipment ID required for packing list" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { data: shipment } = await supabase
          .from("b2b_shipments")
          .select("*")
          .eq("id", shipmentId)
          .single();

        if (!shipment) {
          return new Response(JSON.stringify({ error: "Shipment not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { data: shipmentItems } = await supabase
          .from("b2b_shipment_items")
          .select("*")
          .eq("shipment_id", shipmentId)
          .order("box_number", { ascending: true });

        const doc = PackingListDocument({
          order: {
            order_number: order.order_number,
            order_date: order.order_date,
            shipping_address_en: order.shipping_address_en,
          },
          shipment: {
            shipment_number: shipment.shipment_number,
            planned_date: shipment.planned_date,
            shipped_date: shipment.shipped_date,
            carrier_name: shipment.carrier_name,
            tracking_number: shipment.tracking_number,
            shipping_method: shipment.shipping_method,
            notes: shipment.notes,
          },
          customer: {
            company_name: order.customer?.company_name || "",
            company_name_en: order.customer?.company_name_en,
            contact_name: order.customer?.contact_name,
            address_en: order.customer?.address_en,
          },
          items: shipmentItems || [],
          company: {
            name: "Sundayhug Co., Ltd.",
            address: "Seoul, South Korea",
            phone: company.phone,
            email: company.email,
          },
        });
        pdfBuffer = await renderToBuffer(doc);
        filename = `PackingList_${shipment.shipment_number}.pdf`;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid document type" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
    }

    // 문서 기록 저장
    await supabase.from("b2b_documents").insert({
      order_id: orderId,
      shipment_id: shipmentId || null,
      document_type: documentType,
      document_number: order.order_number,
      file_name: filename,
      generated_at: new Date().toISOString(),
    });

    // PDF 반환 (Buffer를 Uint8Array로 변환)
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error("Failed to generate document:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate document", details: String(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
