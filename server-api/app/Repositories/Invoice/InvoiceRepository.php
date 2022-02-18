<?php

namespace Kinderm8\Repositories\Invoice;

use Kinderm8\Invoice;

class InvoiceRepository implements IInvoiceRepository
{
    private $invoice;

    public function __construct(Invoice $invoice)
    {
        $this->invoice = $invoice;
    }

    public function __call($method, $args)
    {
        return call_user_func_array([$this->invoice, $method], $args);
    }
}
