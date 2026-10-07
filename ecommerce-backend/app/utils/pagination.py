from sqlalchemy.orm import Query



def paginate(
    query: Query,
    : int = 1,
    limit: int = 10
):

    total = query.count()


    items = (
        query
        .offset(
            ( - 1) * limit
        )
        .limit(limit)
        .all()
    )


    return {
        "": ,
        "limit": limit,
        "total": total,
        "items": items
    }