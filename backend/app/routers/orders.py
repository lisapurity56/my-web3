from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from backend.app.database import get_db
from backend.app.dependencies import get_current_user, require_admin
from backend.app.models import Order, OrderItem, Product, User
from backend.app.schemas import OrderCreate, OrderRead, OrderStatusUpdate

router = APIRouter(prefix="/api/v1/orders", tags=["orders"])


@router.get("", response_model=List[OrderRead])
def list_orders(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Order).options(joinedload(Order.items))
    if user.role != "admin":
        query = query.filter(Order.user_id == user.id)
    return query.order_by(Order.created_at.desc(), Order.id.desc()).limit(100).all()


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    product_ids = {item.product_id for item in payload.items}
    products = {
        product.id: product
        for product in db.query(Product)
        .filter(Product.id.in_(product_ids), Product.is_active.is_(True))
        .all()
    }
    missing = product_ids - products.keys()
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active product(s) not found: {', '.join(map(str, sorted(missing)))}.",
        )

    order = Order(user_id=user.id, status="pending", total_amount=Decimal("0.00"))
    for item in payload.items:
        product = products[item.product_id]
        order.items.append(
            OrderItem(
                product_id=product.id,
                quantity=item.quantity,
                unit_price=product.price,
            )
        )
        order.total_amount += product.price * item.quantity

    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.patch("/{order_id}/status", response_model=OrderRead)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return order
